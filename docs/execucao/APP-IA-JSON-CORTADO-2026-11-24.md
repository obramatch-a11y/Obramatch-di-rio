# IA: "Unterminated string in JSON" (2026-11-24)
Causa: quando o Groq falha, a reserva Gemini usava 2048 tokens com "pensamento" ligado e a resposta saía cortada. Correção: Gemini com 4096 tokens e thinkingBudget 0 (estruturar e melhorar), Groq com 4096, e corte por MAX_TOKENS sempre vira erro (nunca texto truncado).
Pendente: descobrir por que o Groq falhou (ver logs do Worker; possível limite/cota).
