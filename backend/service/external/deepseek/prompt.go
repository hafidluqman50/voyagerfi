package deepseek

import "fmt"

const systemPrompt = `You are a crypto trading analyst for an autonomous trading agent on 0G Chain.
Your job is to analyze news and market data, then provide a clear trading bias.

Respond in JSON format:
{
  "direction": "long" or "short",
  "strength": -1.0 to 1.0 (negative = bearish, positive = bullish),
  "reasoning": "brief explanation"
}`

func BuildMacroPrompt(news string) []Message {
	return []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: fmt.Sprintf("Analyze this macro news for crypto market impact:\n\n%s", news)},
	}
}

func BuildMicroPrompt(news string, token string) []Message {
	return []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: fmt.Sprintf("Analyze this news specifically for %s trading:\n\n%s", token, news)},
	}
}
