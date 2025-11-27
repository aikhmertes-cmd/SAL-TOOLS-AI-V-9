import { GoogleGenAI, Modality } from "@google/genai";

const getAi = () => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY is missing! Ensure process.env.API_KEY is set.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

// --- Types ---

export interface Character {
    name: string;
    gender: string;
    age: string;
    description: string;
}

export interface StoryScene {
    scene_number: number;
    title: string;
    slug: string;
    scene_description: { line: string };
    dialog: { character: string; line: string }[];
    prompt: string;
}

export interface StoryIdea {
    title: string;
    summary: string;
}

export interface ScriptOutline {
    title: string;
    outline: { chapter: string; title: string; summary: string }[];
}

export type PrebuiltVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface PodcastCharacter {
    name: string;
}

export interface Dialog {
    character: string;
    line: string;
}

export interface LyricsResponse {
    songTitle: string;
    songLyrics: string;
}

export interface LyricScene {
    scene_number: number;
    title: string;
    prompt: string;
    dialogues: { character: string; text: string }[];
}

export interface SimpleStoryResponse {
    storyTitle: string;
    storyContent: string;
}

export interface VlogScriptResponse {
    youtubeTitle: string;
    youtubeDescription: string;
    vlogScript: string;
}

export interface VideoIdea {
    title: string;
    summary: string;
    sampleScriptLine: string;
}

export interface KhmerScene {
    sceneNumber: number;
    visualPrompt: string;
    dialogues: { character: string; text: string }[];
}

export interface TriviaQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    imagePrompt: string;
}

export interface WebtoonPanel {
    panelNumber: number;
    visualDescription: string;
    dialogue: { character: string; text: string; type: 'speech' | 'thought' | 'narration' }[];
}

export interface RelaxingPromptsResponse {
    musicPrompt: string;
    videoSegments: { segmentNumber: number; prompt: string }[];
}

// --- Functions ---

// Image Editing
export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: prompt }
                ]
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image returned from editImage");
    });
};

// Image Generation
export const generateImage = async (prompt: string, aspectRatio: string = '1:1'): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: { aspectRatio: aspectRatio as any }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    });
};

export const generateImageForScene = generateImage;

export const generateThumbnail = async (title: string, description: string, style: string): Promise<string> => {
    const prompt = `Create a high-quality YouTube thumbnail for a video titled "${title}".
    Description/Context: ${description}
    Visual Style: ${style}
    
    Requirements:
    - Eye-catching and high contrast
    - Clear focal point
    - Vibrant colors
    - 16:9 Aspect Ratio
    `;
    return generateImage(prompt, '16:9');
};

// Image Mixing
export const mixImages = async (base64A: string, mimeTypeA: string, base64B: string, mimeTypeB: string, prompt: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeTypeA, data: base64A } },
                    { inlineData: { mimeType: mimeTypeB, data: base64B } },
                    { text: prompt }
                ]
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No mixed image returned");
    });
};

// Prompt Generation from Image
export const generatePromptFromImage = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Describe this image in detail to be used as a prompt for image generation." }
                ]
            }
        });
        return response.text || "";
    });
};

export const generateVideoPromptFromImage = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Describe this image to be used as a prompt for video generation. Focus on movement and atmosphere." }
                ]
            }
        });
        return response.text || "";
    });
};

// Video Generation
export const generateVideo = async (params: { prompt: string, aspectRatio: string, resolution?: string, image?: {base64: string, mimeType: string} }): Promise<Blob> => {
    const ai = getAi();
    let operation: any;
    
    const config: any = {
        numberOfVideos: 1,
        aspectRatio: params.aspectRatio as any,
        resolution: (params.resolution || '720p') as any,
    };

    if (params.image) {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: params.prompt,
            image: {
                imageBytes: params.image.base64,
                mimeType: params.image.mimeType
            },
            config
        });
    } else {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: params.prompt,
            config
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw new Error(operation.error.message);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error("Failed to download video");
    return await response.blob();
};

// Text Generation & Logic
export const generateStory = async (params: any): Promise<StoryScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Generate a story based on: ${JSON.stringify(params)}. 
        CRITICAL: Keep characters' physical descriptions (hair color, style, clothes, face) EXACTLY the same in every single scene prompt. Do not change their look between scenes.
        Return JSON array of scenes with scene_number, title, slug, scene_description (object with line), dialog (array of objects with character and line), prompt (for image generation).`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        return JSON.parse(response.text || "[]");
    });
};

export const analyzeStoryForCharacters = async (story: string): Promise<Character[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this story and extract characters. Return JSON list of objects with name, gender, age, description. Story: ${story}`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateStoryIdeas = async (theme: string, smartThinking: boolean): Promise<StoryIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 5 story ideas based on theme: ${theme}. Return JSON array of {title, summary}.`,
            config: { responseMimeType: 'application/json', thinkingConfig: smartThinking ? { thinkingBudget: 1024 } : undefined }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateCharacters = async (context: string, count: number, prompt?: string): Promise<Character[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const content = prompt ? `Generate ${count} characters based on this prompt: ${prompt}. Context: ${context}.` : 
                                 `Generate ${count} characters for a story about: ${context}.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${content} Return JSON array of {name, gender, age, description}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateKidsCharacters = async (topic: string): Promise<Character[]> => {
    return generateCharacters(topic, 2); 
}

export const generateTrailerScript = async (params: any): Promise<StoryScene[]> => {
    return generateStory({ ...params, type: 'trailer' });
};

export const assistWriting = async (params: any): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Assist writing story. Params: ${JSON.stringify(params)}. Continue the story naturally.`,
        });
        return response.text || "";
    });
};

export const extendStoryWithImage = async (storyContext: string, imageBase64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: `Story context: ${storyContext}. Extend the story based on this image:` },
                    { inlineData: { mimeType, data: imageBase64 } }
                ]
            }
        });
        return response.text || "";
    });
};

export const generateScriptOutline = async (story: string, prompt: string, lang: string): Promise<ScriptOutline> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a script outline for this story: ${story}. Prompt: ${prompt}. Language: ${lang}. Return JSON {title, outline: [{chapter, title, summary}]}`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const generatePodcastScript = async (params: any): Promise<string | Dialog[]> => {
    return withRetry(async () => {
        const ai = getAi();
        // Word count assumption: ~190 words per minute for lively conversation.
        // For team podcasts, it returns a JSON array of objects.
        // For solo podcasts, it returns a single string.
        // Max output tokens increased to allow for longer scripts (e.g. 20 minutes).
        const approxWordCount = params.durationInMinutes ? params.durationInMinutes * 190 : 600;
        
        const prompt = `Generate a podcast script. 
        Topic: ${params.topic}. 
        Format: ${params.podcastType}. 
        Duration: ${params.durationInMinutes} minutes (Target word count: approx ${approxWordCount} words). 
        Style: ${params.speakingStyle}.
        Language: ${params.language}.
        Characters: ${JSON.stringify(params.characters)}.
        
        INSTRUCTIONS:
        - Deep Dive: Do not summarize. Expand on points, give examples, tell stories.
        - Length: You MUST generate enough content for ${params.durationInMinutes} minutes. This is CRITICAL.
        - If 'Team', return JSON array of {character, line}.
        - If 'Solo', return text script.
        - If an interviewTemplate is provided, use it as the structure but fill in the [placeholders] with detailed, lengthy answers.
        - Be EXTREMELY DETAILED.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: params.podcastType === 'team' ? 'application/json' : 'text/plain',
                maxOutputTokens: 8192 
            }
        });
        if (params.podcastType === 'team') {
            return JSON.parse(response.text || "[]");
        }
        return response.text || "";
    });
};

export const generateQuotifyPrompts = async (speaker: string, count: number, style: string, focus: boolean): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const focusInstruction = focus ? "Ensure the prompt explicitly describes the person's face and features clearly." : "";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate ${count} image prompts for quotes by ${speaker}. Style: ${style}. ${focusInstruction}. 
            IMPORTANT: Every prompt MUST start with "Portrait of ${speaker}". 
            Return JSON array of strings.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const enhanceQuotifyPrompts = async (prompts: string[]): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance these image prompts for better quality: ${JSON.stringify(prompts)}. Return JSON array of strings.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateLyrics = async (params: any): Promise<LyricsResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate song lyrics. Params: ${JSON.stringify(params)}. Return JSON {songTitle, songLyrics}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const generateScenesFromLyrics = async (lyrics: string, style: string): Promise<LyricScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break these lyrics into scenes with image prompts. Lyrics: ${lyrics}. Style: ${style}. Return JSON array of {scene_number, title, prompt, dialogues: [{character, text}]}`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateSimpleStory = async (params: any): Promise<SimpleStoryResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        let contents: any = `Generate a simple story. Params: ${JSON.stringify(params)}. Return JSON {storyTitle, storyContent}.`;
        if (params.image) {
             contents = {
                parts: [
                    { text: `Generate a simple story based on this image and params: ${JSON.stringify(params)}. Return JSON {storyTitle, storyContent}.` },
                    { inlineData: { mimeType: params.image.mimeType, data: params.image.base64 } }
                ]
             };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const generateVlogScript = async (topic: string, style: string): Promise<VlogScriptResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a vlog script for topic: ${topic}, style: ${style}. Return JSON {youtubeTitle, youtubeDescription, vlogScript}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const generateVideoIdeas = async (params: any): Promise<VideoIdea[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate ${params.ideaCount} video ideas. Params: ${JSON.stringify(params)}. Return JSON array of {title, summary, sampleScriptLine}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateKhmerStory = async (topic: string, style: string, count: number, characters: Character[]): Promise<KhmerScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Generate a Khmer story. Topic: ${topic}. Style: ${style}. Scenes: ${count}. Characters: ${JSON.stringify(characters)}. 
        
        CRITICAL INSTRUCTIONS:
        1. Language: All dialogue must be in natural, engaging Khmer.
        2. VISUAL CONSISTENCY: You MUST describe the characters' physical appearance (hair, face, clothes) EXACTLY the same way in EVERY 'visualPrompt'. Do not change their look between scenes.
        3. Scene Continuity: Do not introduce new places unless necessary. Keep the setting consistent.
        
        Return JSON array of {sceneNumber, visualPrompt, dialogues: [{character, text}]}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const translateStoryContent = async (scenes: KhmerScene[], targetLang: string): Promise<KhmerScene[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate this JSON story content to ${targetLang}. Maintain JSON structure. Scenes: ${JSON.stringify(scenes)}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateTrivia = async (topic: string, count: number, difficulty: string, lang: string, style: string): Promise<TriviaQuestion[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate ${count} trivia questions about ${topic}. Difficulty: ${difficulty}. Language: ${lang}. Style: ${style}.
            For 'imagePrompt', create a detailed visual description of the answer in the style of ${style}.
            Return JSON array of {question, options (array), correctAnswer, explanation, imagePrompt}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateVisualStory = async (topic: string, style: string, lang: string): Promise<{ content: string, imagePrompt: string }> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a very short visual story (1 paragraph) about ${topic} in ${lang}. Also provide an image prompt matching style ${style}. Return JSON {content, imagePrompt}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const generateWebtoonScript = async (topic: string, style: string, panels: number, lang: string, characters: any[]): Promise<WebtoonPanel[]> => {
    return withRetry(async () => {
        const ai = getAi();
        const prompt = `Generate a webtoon script. Topic: ${topic}. Style: ${style}. Panels: ${panels}. Language: ${lang}. Characters: ${JSON.stringify(characters)}.
        
        CRITICAL RULES:
        1. VISUAL CONSISTENCY: Repeat the full physical description of each character (hair color, eye color, clothing) in EVERY 'visualDescription'. Never assume the artist knows what they look like from the previous panel.
        2. Maintain the environment description in every panel.
        
        Return JSON array of {panelNumber, visualDescription, dialogue: [{character, text, type}]}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const transcribeVideo = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Transcribe the audio in this video. Provide timestamps." }
                ]
            }
        });
        return response.text || "";
    });
};

export const generateRelaxingPrompts = async (params: any): Promise<RelaxingPromptsResponse> => {
    return withRetry(async () => {
        const ai = getAi();
        
        let prompt = `Generate relaxing video prompts based on: ${JSON.stringify(params)}.`;
        
        if (params.camera && params.camera.startsWith("Auto")) {
            prompt += " CRITICAL: Vary the 'camera' movement dynamically for each segment to create cinematic interest. Do not repeat the same movement.";
        }
        if (params.shot && params.shot.startsWith("Auto")) {
            prompt += " CRITICAL: Vary the 'shot' type (Wide, Close-up, etc.) appropriately for each scene.";
        }
        if (params.useSmartMusic) {
            prompt += " CRITICAL: Create a highly detailed 'musicPrompt' that perfectly synergizes with the visual evolution.";
        }
        if (params.customPrompt) {
            prompt += ` User Custom Idea: "${params.customPrompt}". Use this as the core theme.`;
        }

        // Constraint for Music Prompt length
        const constraint = `
        CRITICAL REQUIREMENT: 
        The 'musicPrompt' field MUST be STRICTLY under 200 characters in length. 
        It is for an AI music generator (like Suno). 
        Do NOT use full sentences. 
        Use concise, comma-separated tags: Genre, Mood, Instruments, BPM. 
        Example: "Lofi hip hop, rain sounds, cozy, piano, calm, 70 bpm".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${prompt}\n${constraint}\nReturn JSON {musicPrompt, videoSegments: [{segmentNumber, prompt}]}.`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const extractLyricsFromMedia = async (base64: string, mimeType: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: `Extract the lyrics from this audio/video.
                    1. Identify the Song Title if possible.
                    2. Format the output clearly with section headers like [Verse 1], [Chorus], [Bridge].
                    3. Use music emojis 🎵 🎶 where appropriate.
                    4. Return ONLY the formatted lyrics text.` }
                ]
            }
        });
        return response.text || "";
    });
};

export const translateSongLyrics = async (lyrics: string, sourceLang: string, targetLang: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following song lyrics from ${sourceLang} to ${targetLang}. 
            CRITICAL: Create a 'Cover Version'. This means you must attempt to maintain the original rhythm, rhyme scheme (if possible), and flow so it can be sung to the original melody. 
            Do not just do a literal translation.
            Lyrics: ${lyrics}`,
        });
        return response.text || "";
    });
};

export const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text from ${sourceLang} to ${targetLang}. Text: ${text}`,
        });
        return response.text || "";
    });
};

// --- Speech Generation ---

export const generateNarration = async (text: string): Promise<string> => {
    return generateVoiceover(text, 'en', 'Puck');
};

export const generateVoiceover = async (text: string, language: string, voice: PrebuiltVoice = 'Kore', emotion?: string, description?: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const config: any = {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice }
                }
            }
        };
        
        let promptText = text;
        if (emotion) {
            promptText = `Say ${emotion}: ${text}`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: promptText }] },
            config
        });

        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64) throw new Error("No audio generated");
        return base64;
    });
};

export const generateDialog = async (dialogs: Dialog[], speakers: { speaker: string; voiceName: PrebuiltVoice }[]): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        let promptText = "TTS the following conversation:\n";
        dialogs.forEach(d => {
            promptText += `${d.character}: ${d.line}\n`;
        });

        const speakerVoiceConfigs = speakers.map(s => ({
            speaker: s.speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voiceName } }
        }));

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: promptText }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakerVoiceConfigs
                    }
                }
            }
        });

        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64) throw new Error("No audio generated");
        return base64;
    });
};

export const generateLyricsFromTitle = async (title: string, gender?: string): Promise<string> => {
    return withRetry(async () => {
        const ai = getAi();
        const genderInstruction = gender ? `The singer is ${gender}, so ensure the lyrics reflect this perspective (pronouns, tone).` : "";
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Find or generate the lyrics for the song titled "${title}".
            Detect the language based on the title (e.g., Khmer title -> Khmer lyrics).
            If it's a famous song, return the original lyrics. If it's a generic title, generate creative lyrics fitting that title.
            ${genderInstruction}
            
            Format the output exactly like this:
            🎵 "${title}" ${gender ? `(${gender} Version)` : ''}
            
            [Verse 1]
            (Lyrics here...)
            
            [Chorus]
            (Lyrics here...)
            
            Identify sections like Verse, Chorus, Bridge.
            Do not output anything else besides the lyrics.`
        });
        return response.text || "";
    });
};