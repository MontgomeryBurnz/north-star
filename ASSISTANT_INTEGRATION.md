# Assistant Integration Note

## Current State

The assistant uses local structured content only. Client-side UI calls the local deterministic assistant path so seeded test behavior stays unchanged.

The server-ready path is available at `POST /api/assistant` and routes through `getAssistantServiceResponse()`.

## Provider Pattern

Provider selection lives in `src/lib/assistant-service.ts`.

- `local`: uses deterministic local retrieval and answer composition.
- `openai`: placeholder provider that still uses local retrieval and makes no external API calls.

`ASSISTANT_PROVIDER=local` is the default. OpenAI secrets must remain server-only and must not use `NEXT_PUBLIC_` prefixes.

## Future Model Payload

The future model should receive:

- user prompt
- short conversation history, if needed
- compact matched local records from initiatives, frameworks, AI products, experiments, FAQs, and profile data
- source labels and record IDs for grounding
- response format instructions matching `AssistantServiceResponse`

The model should not receive the entire site content registry by default. Send only top-ranked, relevant records assembled by local retrieval.

## Grounded Context Assembly

Grounding should continue to start with local retrieval:

1. Tokenize the prompt.
2. Rank local records by keyword, tag, and exact title matches.
3. Build a compact context package from matched records.
4. Pass that package to the future OpenAI provider.

This keeps the model constrained to inspectable local content and preserves the debug view.

## Combining Local Content And Model Output

The future OpenAI provider should use model output for synthesis only. Local data should remain authoritative for:

- related systems, frameworks, and products
- source labels
- matched records
- debug metadata
- fallback behavior

The final response should validate into `AssistantServiceResponse` before returning to the client.
