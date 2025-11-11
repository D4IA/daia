import { ChatOpenAI } from '@langchain/openai';

export const openAI41Nano = new ChatOpenAI({
	apiKey: import.meta.env.VITE_OPENAI_API_KEY,
	model: 'gpt-4.1-nano',
});

export const openAI41Mini = new ChatOpenAI({
	apiKey: import.meta.env.VITE_OPENAI_API_KEY,
	model: 'gpt-4.1-mini',
});
