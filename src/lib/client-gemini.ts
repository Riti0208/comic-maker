'use client';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { db } from './db';

/**
 * Gemini APIのクライアントラッパー
 * IndexedDBから設定を読み込み、各種生成処理を実行
 */
export class ClientGeminiAPI {
  /** IndexedDBからAPIキーを取得 */
  private async getAPIKey(): Promise<string> {
    const apiKey = await db.getSetting('gemini_api_key');
    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定画面からAPIキーを入力してください。');
    }
    return apiKey;
  }

  /** テキスト生成モデル名を取得（デフォルト: gemini-3-pro-preview） */
  private async getTextModel(): Promise<string> {
    return (await db.getSetting('text_model')) || 'gemini-3-pro-preview';
  }

  /** 画像生成モデル名を取得（デフォルト: gemini-3-pro-image-preview） */
  private async getImageModel(): Promise<string> {
    return (await db.getSetting('image_model')) || 'gemini-3-pro-image-preview';
  }

  /** ストーリーとキャラクターを生成（旧バージョン、互換性のため残存） */
  async generateStory(topic: string): Promise<{ title: string, panels: string[], characterDefinitions: { name: string, description: string, firstPerson?: string, personality?: string }[] }> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getTextModel();
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'あなたはプロの4コマ漫画アーティスト兼ライターです。面白く、魅力的で、視覚的に詳細な4コマ漫画を作成することが目標です。',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });

    const prompt = `
以下のトピックをもとに、4コマ漫画のストーリーを作成してください: "${topic}"

ステップ1: キャラクターを定義する。
ストーリーに必要な数だけキャラクターを作成してください（1〜4人程度）。各キャラクターの外見（髪、目、服装、アクセサリー）、一人称、性格を詳細に定義してください。

ステップ2: ストーリーボードを作成する。
各パネルについて、詳細な視覚的説明を提供してください。

以下の構造のJSONオブジェクトのみを出力してください:
{
  "title": "漫画のキャッチーなタイトル",
  "characters": [
    {
      "name": "キャラクター名",
      "description": "詳細な視覚的説明...",
      "firstPerson": "一人称（僕、俺、私など）",
      "personality": "性格の簡潔な説明"
    }
  ],
  "panels": [
    "パネル1: [シーンの説明] [セリフ]",
    "パネル2: ...",
    "パネル3: ...",
    "パネル4: ..."
  ]
}
マークダウン形式やコードブロックは含めないでください。生のJSONオブジェクトのみを出力してください。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        title: parsed.title || topic,
        panels: parsed.panels || [],
        characterDefinitions: parsed.characters || []
      };
    } catch (e) {
      // JSONパース失敗時はデフォルト値を返す
      return {
        title: topic,
        panels: [
          `${topic} - パネル1`,
          `${topic} - パネル2`,
          `${topic} - パネル3`,
          `${topic} - パネル4`,
        ],
        characterDefinitions: []
      };
    }
  }

  /** プロジェクトコンテキストを考慮してエピソードストーリーを生成 */
  async generateEpisodeStory(
    topic: string,
    projectContext: {
      description: string;
      artStyle: string;
      existingCharacters: { name: string; description: string }[];
      allowNewCharacters: boolean;
      maxNewCharacters?: number;
    }
  ): Promise<{ title: string, panels: string[], characterDefinitions: { name: string, description: string, firstPerson?: string, personality?: string }[] }> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getTextModel();
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'あなたはプロの4コマ漫画アーティスト兼ライターです。面白く、魅力的で、視覚的に詳細な4コマ漫画を作成することが目標です。',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });

    const existingCharsContext = projectContext.existingCharacters.length > 0
      ? `既存キャラクター:\n${projectContext.existingCharacters.map(c => `${c.name}: ${c.description}`).join('\n')}`
      : '';

    const newCharInstruction = projectContext.allowNewCharacters
      ? `ストーリーに必要な場合は、新しいキャラクターを作成しても構いません（最大${projectContext.maxNewCharacters || 2}人まで）。既存キャラクターを使用する場合は、そのまま使用してください。`
      : '既存キャラクターのみを使用してストーリーを作成してください。新しいキャラクターは作成しないでください。';

    const prompt = `
プロジェクト: "${projectContext.description}"
画風: ${projectContext.artStyle}

${existingCharsContext}

${newCharInstruction}

エピソードトピック: "${topic}"

以下のトピックをもとに、4コマ漫画のストーリーを作成してください。

ステップ1: キャラクターを定義する。
- 既存キャラクターを使用する場合は、そのキャラクターをそのまま使用してください。
- 新しいキャラクターを作成する場合は、外見（髪、目、服装、アクセサリー）、一人称、性格を詳細に定義してください。

ステップ2: ストーリーボードを作成する。
各パネルについて、詳細な視覚的説明を提供してください。

以下の構造のJSONオブジェクトのみを出力してください:
{
  "title": "漫画のキャッチーなタイトル",
  "characters": [
    {
      "name": "キャラクター名",
      "description": "詳細な視覚的説明...",
      "firstPerson": "一人称（僕、俺、私など）",
      "personality": "性格の簡潔な説明"
    }
  ],
  "panels": [
    "パネル1: [シーンの説明] [セリフ]",
    "パネル2: ...",
    "パネル3: ...",
    "パネル4: ..."
  ]
}
マークダウン形式やコードブロックは含めないでください。生のJSONオブジェクトのみを出力してください。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        title: parsed.title || topic,
        panels: parsed.panels || [],
        characterDefinitions: parsed.characters || []
      };
    } catch (e) {
      // JSONパース失敗時はデフォルト値を返す
      return {
        title: topic,
        panels: [
          `${topic} - パネル1`,
          `${topic} - パネル2`,
          `${topic} - パネル3`,
          `${topic} - パネル4`,
        ],
        characterDefinitions: []
      };
    }
  }

  /** 説明文からキャラクター詳細を自動生成 */
  async generateAICharacter(description: string): Promise<{ name: string, appearance: string, firstPerson: string, personality: string }> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getTextModel();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
以下の説明に基づいて、キャラクターの詳細を生成してください:

${description}

以下のJSON形式で出力してください:
{
  "name": "キャラクター名",
  "appearance": "外見の詳細な説明（髪型、目の色、服装など）",
  "firstPerson": "一人称（僕、俺、私など）",
  "personality": "性格の簡潔な説明"
}

マークダウン形式やコードブロックは含めないでください。生のJSONオブジェクトのみを出力してください。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  }

  /** キャラクター参考画像を生成（表情集付き） */
  async generateCharacterImage(
    character: { name: string, description: string },
    projectInfo?: { artStyle: string, description?: string, existingCharacters?: Array<{ name: string, description: string, personality?: string, firstPerson?: string }> },
    referenceImages: string[] = []
  ): Promise<string> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getImageModel();
    const genAI = new GoogleGenerativeAI(apiKey);
    const imageModel = genAI.getGenerativeModel({ model: modelName });

    // アートスタイルに応じた具体的な指示
    const styleInstructions: { [key: string]: string } = {
      '日本の漫画': 'アニメ/漫画スタイル。大きな瞳、細い線画、はっきりとした輪郭線。髪の毛は束感を意識した表現。',
      'アメコミ': 'アメコミスタイル。力強い線、筋肉の強調、影の強いコントラスト。ダイナミックなポーズ。',
      'ウェブトゥーン': '韓国ウェブトゥーンスタイル。やわらかい線、現代的でリアル寄りの顔立ち、自然な髪の流れ。',
      'ちびキャラ': 'SDキャラ/ちびキャラスタイル。2〜3頭身、大きな頭、丸みを帯びた体型、可愛らしいデフォルメ。',
      'ノワール/ダーク': 'ノワール/ダークスタイル。暗めのトーン、影を強調、シャープな線、大人っぽい雰囲気。'
    };

    const artStyleGuide = projectInfo?.artStyle ? styleInstructions[projectInfo.artStyle] || '' : '';
    const projectContext = projectInfo?.description ? `\n作品の世界観: ${projectInfo.description}` : '';

    // 既存キャラクター情報を整形
    const existingCharsInfo = projectInfo?.existingCharacters && projectInfo.existingCharacters.length > 0
      ? '\n\n【このプロジェクトの既存キャラクター】\n' +
        projectInfo.existingCharacters.map(c => {
          const parts = [`- ${c.name}: ${c.description}`];
          if (c.personality) parts.push(`性格: ${c.personality}`);
          if (c.firstPerson) parts.push(`一人称: ${c.firstPerson}`);
          return parts.join('、');
        }).join('\n') +
        '\n※ 新キャラクターの説明に既存キャラ名が含まれる場合（例：「〇〇のパパ」「〇〇の妹」）、上記の情報を参考にしてデザインしてください。'
      : '';

    const prompt = `🔴🔴🔴 超重要指示：必ず最初の参考画像のレイアウトを完全にコピーしてください 🔴🔴🔴

最初に提供した画像は、キャラクターシートの「絶対に守るべきレイアウトテンプレート」です。
このレイアウトを1ピクセル単位で完全に再現してください。

【絶対に守るべき構造】
1. 上部の「NAME」枠 → 「${character.name}」に置き換え（位置・サイズ・枠のスタイルは同じ）
2. 左側の全身正面図 → サイズと位置を参考画像と完全一致させる
3. 中央の全身背面図 → サイズと位置を参考画像と完全一致させる
4. 右側の表情シート（2x2グリッド）→ サイズと位置を参考画像と完全一致させる
   - 左上：笑顔
   - 右上：泣き顔
   - 左下：怒り顔
   - 右下：驚き顔

【アートスタイル】
${artStyleGuide || '汎用的なイラストスタイル'}${projectContext}${existingCharsInfo}

【新しく作成するキャラクター】
名前: ${character.name}
外見: ${character.description}

【最終確認事項】
✓ 参考画像と同じレイアウト構造になっているか？
✓ 各要素の配置・サイズは参考画像と一致しているか？
✓ 上部のNAME枠は参考画像と同じスタイルで「${character.name}」になっているか？
✓ 背景は中立的な色になっているか？

参考画像のレイアウトを守ることが最優先です。守れない場合は生成しないでください。`;

    const parts: any[] = [];

    // キャラクターリファレンス画像を追加（public/character-reference.jpg）
    try {
      console.log('📸 character-reference.jpg読み込み開始');
      const referenceResponse = await fetch('/character-reference.jpg');
      if (referenceResponse.ok) {
        const blob = await referenceResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = blob.type || 'image/jpeg';

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
        console.log('✅ character-reference.jpg追加成功 (mimeType:', mimeType, ', data length:', base64Data.length, ')');
      } else {
        console.error('❌ character-reference.jpg取得失敗:', referenceResponse.status);
      }
    } catch (e) {
      console.error('❌ character-reference.jpg読み込み失敗:', e);
      // リファレンス画像の読み込みに失敗してもキャラクター生成は続行
    }

    // プロンプトを追加
    parts.push({ text: prompt });

    // 追加のリファレンス画像があれば追加
    referenceImages.forEach(img => {
      if (img.startsWith('data:image')) {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
    });

    const result = await imageModel.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const response = await result.response;

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated');
  }

  /** 4コマ漫画の完成画像を生成（レイアウト参考画像 + キャラクター画像を使用） */
  async generateFullComic(
    topic: string,
    title: string,
    panels: string[],
    characters: { name: string, description: string, imagePreviewUrl?: string }[]
  ): Promise<string> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getImageModel();
    const genAI = new GoogleGenerativeAI(apiKey);
    const imageModel = genAI.getGenerativeModel({ model: modelName });

    const charDesc = characters.map(c => `${c.name}: ${c.description}`).join('\n');
    const panelsDesc = panels.map((p, i) => `パネル${i + 1}: ${p}`).join('\n');

    const prompt = `
【絶対厳守：レイアウト参考画像の使用】

🔴 最初に提供される画像は4コマ漫画のレイアウトテンプレートです
🔴 この画像の構造を完全に再現してください：
  - タイトル枠の形、位置、サイズ
  - 4つのコマの配置、サイズ、間隔
  - 全体のレイアウト構成
🔴 参考画像にあるタイトル枠は残したまま、その中にタイトルテキストを配置してください

【レイアウト要件】
✅ 使用するレイアウト：縦長（上から下へ4コマが縦に並ぶ）
❌ 禁止レイアウト：2x2グリッド（上2コマ・下2コマの配置）

構造：
- 画像全体の縦横比：9:16（参考画像と同じ）
- コマ配置：上から下へ1列に4コマを縦に積み重ねる（参考画像と同じ）
- 各コマは横長の長方形
- コマとコマの間に細い境界線

⚠️ 参考画像のレイアウトを必ず踏襲してください

---

【コミック内容】
トピック: "${topic}"
タイトル: "${title}"

タイトル「${title}」を参考画像のタイトル枠内に配置してください。
参考画像にあるタイトル枠のデザインや位置はそのまま保持し、その中にタイトルテキストを表示してください。

キャラクター:
${charDesc}

プロット:
${panelsDesc}

スタイル: 日本の漫画スタイル、高品質、詳細
読み順: 上から下（縦長レイアウト）、各コマ内は右から左

提供されたキャラクター参考画像に基づいて、キャラクターの外見を一貫して維持してください。
日本語のセリフを含む吹き出しを含めてください。

【重要：効果音の表現方法】
- 効果音は吹き出しの外に大きな文字で視覚的に表現してください
- キャラクターのセリフ（吹き出し内）に効果音を含めないでください
- 吹き出し内のセリフに括弧（）で効果音を書かないでください
- 例: NG「何これ！(ガシャーン)」 → OK「何これ！」+ 吹き出しの外に「ガシャーン」
    `;

    const parts: any[] = [{ text: prompt }];

    // 4コマのレイアウト参考画像を追加（public/reference.jpg）
    try {
      console.log('reference.jpg読み込み開始');
      const referenceResponse = await fetch('/reference.jpg');
      console.log('fetch結果:', referenceResponse.status, referenceResponse.ok);

      if (!referenceResponse.ok) {
        throw new Error(`Failed to fetch: ${referenceResponse.status}`);
      }

      const referenceBlob = await referenceResponse.blob();
      console.log('blob取得:', referenceBlob.size, 'bytes, type:', referenceBlob.type);

      const reader = new FileReader();
      const base64Reference = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(referenceBlob);
      });

      const base64Data = base64Reference.split(',')[1];
      const mimeType = base64Reference.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
      console.log('✅ reference.jpg追加成功 (mimeType:', mimeType, ', data length:', base64Data.length, ')');
    } catch (e) {
      console.error('❌ reference.jpg読み込み失敗:', e);
    }

    // キャラクター参考画像を追加
    characters.forEach((char) => {
      if (char.imagePreviewUrl && char.imagePreviewUrl.startsWith('data:image')) {
        const base64Data = char.imagePreviewUrl.split(',')[1];
        const mimeType = char.imagePreviewUrl.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
    });

    const result = await imageModel.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '9:16',
        }
      } as any
    });

    const response = await result.response;

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated');
  }

  /** 既存のコミック画像を修正指示に基づいて編集 */
  async editComicImage(
    existingImage: string,
    editInstructions: string,
    characterImages: string[]
  ): Promise<string> {
    const apiKey = await this.getAPIKey();
    const modelName = await this.getImageModel();
    const genAI = new GoogleGenerativeAI(apiKey);
    const imageModel = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
以下は既存の4コマ漫画画像です。

修正指示：
${editInstructions}

既存の画像のレイアウトと全体的な構成は保持しながら、上記の修正指示に従って画像を修正してください。
4コマ漫画の構成（縦長レイアウト、4つのパネル）は維持してください。
    `;

    const parts: any[] = [{ text: prompt }];

    // Add existing comic image
    if (existingImage.startsWith('data:image')) {
      const base64Data = existingImage.split(',')[1];
      const mimeType = existingImage.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    // Add character reference images
    characterImages.forEach((img) => {
      if (img.startsWith('data:image')) {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
    });

    const result = await imageModel.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '9:16',
        }
      } as any
    });

    const response = await result.response;

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated');
  }
}

export const clientGemini = new ClientGeminiAPI();
