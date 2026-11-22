import { ServiceError, toServiceError } from '../errors';
import { httpRequest, readSSE, requestJson, type HttpConfig } from '../http/client';
import type { ChatChunk, ChatRequest, ChatResult, LLMProvider, TokenUsage } from '../types';

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}
interface OpenAIChatResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: OpenAIUsage;
}
interface OpenAIStreamChunk {
  choices?: { delta?: { content?: string } }[];
  usage?: OpenAIUsage;
}

const mapUsage = (u: OpenAIUsage): TokenUsage => ({
  promptTokens: u.prompt_tokens ?? 0,
  completionTokens: u.completion_tokens ?? 0,
});

/**
 * OpenAI 兼容协议实现：适配校内网关、vLLM / Ollama / LM Studio 等本地开源模型服务，
 * 以及提供兼容接口的云端模型服务。
 */
export class OpenAICompatibleLLM implements LLMProvider {
  readonly kind = 'remote' as const;

  constructor(
    private readonly http: HttpConfig,
    private readonly defaultModel: string,
    private readonly scenarioHeader: boolean,
  ) {}

  private model(req: ChatRequest) {
    const m = req.model || this.defaultModel;
    if (!m) throw new ServiceError('not_configured', '未配置模型 ID，请在“接口设置”中填写默认模型');
    return m;
  }

  private body(req: ChatRequest, stream: boolean) {
    return {
      model: this.model(req),
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
    };
  }

  private headers(req: ChatRequest): Record<string, string> | undefined {
    return this.scenarioHeader && req.scenario ? { 'X-Zhishu-Scenario': req.scenario.id } : undefined;
  }

  async *stream(req: ChatRequest): AsyncGenerator<ChatChunk> {
    const { res, dispose } = await httpRequest(this.http, '/chat/completions', {
      body: this.body(req, true),
      headers: this.headers(req),
      signal: req.signal,
      accept: 'text/event-stream',
    });
    try {
      // 兼容忽略 stream 参数、直接返回整段 JSON 的网关
      if (!(res.headers.get('content-type') ?? '').includes('event-stream')) {
        const json = (await res.json()) as OpenAIChatResponse;
        yield { delta: json.choices?.[0]?.message?.content ?? '', usage: json.usage ? mapUsage(json.usage) : undefined };
        return;
      }
      for await (const data of readSSE(res)) {
        if (data === '[DONE]') break;
        let json: OpenAIStreamChunk;
        try {
          json = JSON.parse(data) as OpenAIStreamChunk;
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { delta };
        if (json.usage) yield { delta: '', usage: mapUsage(json.usage) };
      }
    } catch (e) {
      if (req.signal?.aborted) throw new ServiceError('aborted');
      throw toServiceError(e);
    } finally {
      dispose();
    }
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const t0 = performance.now();
    const json = await requestJson<OpenAIChatResponse>(
      this.http,
      '/chat/completions',
      { body: this.body(req, false), headers: this.headers(req), signal: req.signal },
      1,
    );
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new ServiceError('invalid_response');
    return {
      content,
      model: json.model ?? this.model(req),
      usage: json.usage ? mapUsage(json.usage) : undefined,
      latencyMs: Math.round(performance.now() - t0),
    };
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const json = await requestJson<{ data?: { id?: string }[] }>(this.http, '/models', { signal });
    return (json?.data ?? []).map((m) => m.id ?? '').filter(Boolean);
  }
}
