// agent-settings.ts — the agent's BYO OpenRouter credentials.
//
// Stored in localStorage only, never in the repo, never sent anywhere except
// api.openrouter.ai. The app ships with no key; each user brings their own.

export const AGENT_SETTINGS_KEY = 'glyphdance.agent.v1';

/** Default model when the user hasn't picked one. */
export const DEFAULT_MODEL = 'deepseek/deepseek-chat';

export interface AgentSettings {
  /** OpenRouter API key (sk-or-...). Empty until the user adds one. */
  apiKey: string;
  /** OpenRouter model id, e.g. "openrouter/auto" or "...:free". */
  model: string;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  apiKey: '',
  model: DEFAULT_MODEL,
};

export function loadAgentSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(AGENT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const o = JSON.parse(raw) as Partial<AgentSettings>;
    return {
      apiKey: typeof o.apiKey === 'string' ? o.apiKey : '',
      model:
        typeof o.model === 'string' && o.model.length > 0
          ? o.model
          : DEFAULT_MODEL,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAgentSettings(s: AgentSettings): void {
  try {
    localStorage.setItem(
      AGENT_SETTINGS_KEY,
      JSON.stringify({ apiKey: s.apiKey, model: s.model }),
    );
  } catch {
    /* storage unavailable — settings last for the session */
  }
}
