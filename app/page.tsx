'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Settings2, LayoutListIcon as LayoutSideBySide, LayoutGridIcon as LayoutVertical, RotateCcw, Maximize2 } from 'lucide-react'
import { useAudioProcessing } from './hooks/useAudioProcessing'
import { VolumeGauge } from './components/VolumeGauge'

type LayoutMode = 'side-by-side' | 'vertical' | 'inverse' | 'translation-only';

export default function SimultaneousInterpretationSystem() {
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [useLocalProcessing, setUseLocalProcessing] = useState(true)
  const [updateInterval, setUpdateInterval] = useState(100)
  const [voiceThreshold, setVoiceThreshold] = useState(0.1)
  const [showOptions, setShowOptions] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side')
  const japaneseMessagesEndRef = useRef<HTMLDivElement>(null)
  const translatedMessagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isListening,
    messages,
    startListening,
    stopListening,
    clearConversation,
    currentVolume,
    error,
    performanceMetrics
  } = useAudioProcessing(targetLanguage, useLocalProcessing, updateInterval, voiceThreshold)

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  useEffect(() => {
    japaneseMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    translatedMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const transcriptMessages = useMemo(() => messages.filter(m => m.type === 'transcript' && m.isFinal), [messages]);
  const translationMessages = useMemo(() => messages.filter(m => m.type === 'translation'), [messages]);

  const renderLayoutButtons = () => (
    <div className="flex gap-2">
      <Button
        variant={layoutMode === 'side-by-side' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setLayoutMode('side-by-side')}
        title="左右表示"
      >
        <LayoutSideBySide className="h-4 w-4" />
      </Button>
      <Button
        variant={layoutMode === 'vertical' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setLayoutMode('vertical')}
        title="縦表示"
      >
        <LayoutVertical className="h-4 w-4" />
      </Button>
      <Button
        variant={layoutMode === 'inverse' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setLayoutMode('inverse')}
        title="翻訳言語反転表示"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant={layoutMode === 'translation-only' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setLayoutMode('translation-only')}
        title="翻訳のみ表示"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const getLanguageDisplay = (langCode: string): string => {
    switch (langCode) {
      // 東アジア
      case 'en': return '英語';
      case 'zh': return '中国語（簡体字）';
      case 'zh-HK': return '広東語（繁体字）';
      case 'zh-TW': return '台湾中国語（繁体字）';
      case 'ko': return '韓国語';
      case 'mo': return 'モンゴル語';

      // 東南アジア
      case 'vi': return 'ベトナム語';
      case 'th': return 'タイ語';
      case 'ms': return 'マレー語';
      case 'id': return 'インドネシア語';
      case 'fil': return 'フィリピン語';
      case 'my': return 'ミャンマー語';
      case 'km': return 'クメール語';
      case 'lo': return 'ラオ語';
      case 'tl': return 'タガログ語';

      // 南アジア
      case 'hi': return 'ヒンディー語';
      case 'bn': return 'ベンガル語';
      case 'ur': return 'ウルドゥー語';
      case 'ta': return 'タミル語';
      case 'te': return 'テルグ語';
      case 'mr': return 'マラーティー語';
      case 'gu': return 'グジャラーティー語';
      case 'kn': return 'カンナダ語';
      case 'ml': return 'マラヤーラム語';
      case 'pa': return 'パンジャーブ語';
      case 'or': return 'オリヤー語';
      case 'si': return 'シンハラ語';

      // 西欧
      case 'fr': return 'フランス語';
      case 'de': return 'ドイツ語';
      case 'es': return 'スペイン語';
      case 'it': return 'イタリア語';
      case 'pt': return 'ポルトガル語';
      case 'nl': return 'オランダ語';

      // 北欧
      case 'sv': return 'スウェーデン語';
      case 'da': return 'デンマーク語';
      case 'no': return 'ノルウェー語';
      case 'fi': return 'フィンランド語';
      case 'is': return 'アイスランド語';

      // 東欧
      case 'ru': return 'ロシア語';
      case 'pl': return 'ポーランド語';
      case 'uk': return 'ウクライナ語';
      case 'cs': return 'チェコ語';
      case 'hu': return 'ハンガリー語';
      case 'ro': return 'ルーマニア語';
      case 'bg': return 'ブルガリア語';
      case 'sk': return 'スロバキア語';
      case 'hr': return 'クロアチア語';
      case 'sr': return 'セルビア語';
      case 'sl': return 'スロベニア語';
      case 'lt': return 'リトアニア語';
      case 'lv': return 'ラトビア語';
      case 'et': return 'エストニア語';

      // その他ヨーロッパ
      case 'el': return 'ギリシャ語';
      case 'tr': return 'トルコ語';
      case 'ka': return 'グルジア語';

      // 中東
      case 'ar': return 'アラビア語';
      case 'he': return 'ヘブライ語';
      case 'fa': return 'ペルシャ語';
      case 'ku': return 'クルド語';
      case 'am': return 'アムハラ語';
      case 'yi': return 'イディッシュ語';

      // アフリカ
      case 'sw': return 'スワヒリ語';
      case 'zu': return 'ズールー語';
      case 'xh': return 'コーサ語';
      case 'ny': return 'チェワ語';
      case 'ha': return 'ハウサ語';
      case 'ig': return 'イボ語';
      case 'yo': return 'ヨルバ語';

      // 国際補助言語
      case 'eo': return 'エスペラント語';

      default: return 'その他';
    }
};

return (
  <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">EarthSync</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <Button 
            onClick={toggleListening}
            variant={isListening ? "destructive" : "default"}
          >
            {isListening ? '停止' : '開始'}
          </Button>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="言語を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">英語</SelectItem>
              <SelectItem value="zh">中国語（簡体字）</SelectItem>
              <SelectItem value="zh-HK">広東語（繁体字）</SelectItem>
              <SelectItem value="zh-TW">台湾中国語（繁体字）</SelectItem>
              <SelectItem value="ko">韓国語</SelectItem>
              <SelectItem value="mo">モンゴル語</SelectItem>
              <SelectItem value="vi">ベトナム語</SelectItem>
              <SelectItem value="th">タイ語</SelectItem>
              <SelectItem value="ms">マレー語</SelectItem>
              <SelectItem value="id">インドネシア語</SelectItem>
              <SelectItem value="fil">フィリピン語</SelectItem>
              <SelectItem value="my">ミャンマー語</SelectItem>
              <SelectItem value="km">クメール語</SelectItem>
              <SelectItem value="lo">ラオ語</SelectItem>
              <SelectItem value="tl">タガログ語</SelectItem>
              <SelectItem value="hi">ヒンディー語</SelectItem>
              <SelectItem value="bn">ベンガル語</SelectItem>
              <SelectItem value="ur">ウルドゥー語</SelectItem>
              <SelectItem value="ta">タミル語</SelectItem>
              <SelectItem value="te">テルグ語</SelectItem>
              <SelectItem value="mr">マラーティー語</SelectItem>
              <SelectItem value="gu">グジャラーティー語</SelectItem>
              <SelectItem value="kn">カンナダ語</SelectItem>
              <SelectItem value="ml">マラヤーラム語</SelectItem>
              <SelectItem value="pa">パンジャーブ語</SelectItem>
              <SelectItem value="or">オリヤー語</SelectItem>
              <SelectItem value="si">シンハラ語</SelectItem>
              <SelectItem value="fr">フランス語</SelectItem>
              <SelectItem value="de">ドイツ語</SelectItem>
              <SelectItem value="es">スペイン語</SelectItem>
              <SelectItem value="it">イタリア語</SelectItem>
              <SelectItem value="pt">ポルトガル語</SelectItem>
              <SelectItem value="nl">オランダ語</SelectItem>
              <SelectItem value="sv">スウェーデン語</SelectItem>
              <SelectItem value="da">デンマーク語</SelectItem>
              <SelectItem value="no">ノルウェー語</SelectItem>
              <SelectItem value="fi">フィンランド語</SelectItem>
              <SelectItem value="is">アイスランド語</SelectItem>
              <SelectItem value="ru">ロシア語</SelectItem>
              <SelectItem value="pl">ポーランド語</SelectItem>
              <SelectItem value="uk">ウクライナ語</SelectItem>
              <SelectItem value="cs">チェコ語</SelectItem>
              <SelectItem value="hu">ハンガリー語</SelectItem>
              <SelectItem value="ro">ルーマニア語</SelectItem>
              <SelectItem value="bg">ブルガリア語</SelectItem>
              <SelectItem value="sk">スロバキア語</SelectItem>
              <SelectItem value="hr">クロアチア語</SelectItem>
              <SelectItem value="sr">セルビア語</SelectItem>
              <SelectItem value="sl">スロベニア語</SelectItem>
              <SelectItem value="lt">リトアニア語</SelectItem>
              <SelectItem value="lv">ラトビア語</SelectItem>
              <SelectItem value="et">エストニア語</SelectItem>
              <SelectItem value="el">ギリシャ語</SelectItem>
              <SelectItem value="tr">トルコ語</SelectItem>
              <SelectItem value="ka">グルジア語</SelectItem>
              <SelectItem value="ar">アラビア語</SelectItem>
              <SelectItem value="he">ヘブライ語</SelectItem>
              <SelectItem value="fa">ペルシャ語</SelectItem>
              <SelectItem value="ku">クルド語</SelectItem>
              <SelectItem value="am">アムハラ語</SelectItem>
              <SelectItem value="yi">イディッシュ語</SelectItem>
              <SelectItem value="sw">スワヒリ語</SelectItem>
              <SelectItem value="zu">ズールー語</SelectItem>
              <SelectItem value="xh">コーサ語</SelectItem>
              <SelectItem value="ny">チェワ語</SelectItem>
              <SelectItem value="ha">ハウサ語</SelectItem>
              <SelectItem value="ig">イボ語</SelectItem>
              <SelectItem value="yo">ヨルバ語</SelectItem>
              <SelectItem value="eo">エスペラント語</SelectItem>
            </SelectContent>
            </Select>
            {renderLayoutButtons()}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowOptions(!showOptions)}
              className={showOptions ? 'bg-accent' : ''}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button onClick={clearConversation} variant="outline">
              会話をクリア
            </Button>
          </div>

          {showOptions && (
            <div className="space-y-4 mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span>ローカル処理を使用</span>
                <Switch
                  checked={useLocalProcessing}
                  onCheckedChange={setUseLocalProcessing}
                />
              </div>
              <div>
                <label htmlFor="update-interval" className="block text-sm font-medium text-gray-700 mb-2">
                  音声認識の更新間隔: {updateInterval}ミリ秒
                </label>
                <Slider
                  id="update-interval"
                  min={50}
                  max={500}
                  step={50}
                  value={[updateInterval]}
                  onValueChange={(value) => setUpdateInterval(value[0])}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="voice-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                  音声検出閾値: {voiceThreshold.toFixed(3)}
                </label>
                <Slider
                  id="voice-threshold"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={[voiceThreshold]}
                  onValueChange={(value) => setVoiceThreshold(value[0])}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  マイク音量
                </label>
                <VolumeGauge volume={currentVolume} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">パフォーマンスメトリクス</h3>
                <p>メモリ使用量: {performanceMetrics.memoryUsage.toFixed(2)} MB</p>
                <p>CPU使用率: {performanceMetrics.cpuUsage.toFixed(2)}%</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              <p>エラーが発生しました: {error}</p>
              <p>システムを再起動してください。問題が解決しない場合は、管理者にお問い合わせください。</p>
            </div>
          )}
        </div>
        
        {layoutMode === 'vertical' ? (
          <div className="bg-white shadow-md rounded-lg p-6 h-[calc(100vh-300px)] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">メッセージ</h2>
            <div className="space-y-4">
              {transcriptMessages.map((message, index) => (
                <div key={`message-${message.timestamp}`} className="space-y-2">
                  <div className="p-3 rounded-lg bg-green-100">
                    <p>日本語：{message.content}</p>
                  </div>
                  {translationMessages[index] && (
                    <div className={`p-3 rounded-lg ${translationMessages[index].status === 'api' ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                      <p>翻訳（{getLanguageDisplay(targetLanguage)}）：{translationMessages[index].content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {translationMessages[index].status === 'api' ? '翻訳' : 'フォールバック翻訳'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : layoutMode === 'translation-only' ? (
          <div className="bg-white shadow-md rounded-lg p-6 h-[calc(100vh-300px)] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">翻訳 ({getLanguageDisplay(targetLanguage)})</h2>
            <div className="space-y-4">
              {translationMessages.map((message) => (
                <div key={message.timestamp} className={`p-3 rounded-lg ${message.status === 'api' ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                  <p>{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.status === 'api' ? '翻訳' : 'フォールバック翻訳'}
                  </p>
                </div>
              ))}
              {translationMessages.length === 0 && (
                <p className="text-gray-600">まだ翻訳結果はありません。音声認識が開始されると翻訳結果が表示されます。</p>
              )}
              <div ref={translatedMessagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex space-x-4">
            <div className="w-1/2 bg-white shadow-md rounded-lg p-6 h-[calc(100vh-300px)] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">日本語</h2>
              <div className="space-y-4">
                {transcriptMessages.map((message) => (
                  <div key={message.timestamp} className="p-3 rounded-lg bg-green-100">
                    <p>{message.content}</p>
                  </div>
                ))}
                {transcriptMessages.length === 0 && (
                  <p className="text-gray-600">まだメッセージはありません。話し始めると音声認識結果が表示されます。</p>
                )}
                <div ref={japaneseMessagesEndRef} />
              </div>
            </div>
            <div className="w-1/2 bg-white shadow-md rounded-lg p-6 h-[calc(100vh-300px)] overflow-y-auto">
              <div className={layoutMode === 'inverse' ? 'transform rotate-180' : ''}>
                <h2 className={`text-xl font-semibold mb-4 ${layoutMode === 'inverse' ? 'transform rotate-180' : ''}`}>
                  翻訳 ({getLanguageDisplay(targetLanguage)})
                </h2>
                <div className={`space-y-4 ${layoutMode === 'inverse' ? 'transform rotate-180 flex flex-col-reverse' : ''}`}>
                  {translationMessages.map((message) => (
                    <div key={message.timestamp} className={`p-3 rounded-lg ${message.status === 'api' ? 'bg-blue-100' : 'bg-yellow-100'} ${layoutMode === 'inverse' ? 'transform rotate-180' : ''}`}>
                      <p>{message.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {message.status === 'api' ? '翻訳' : 'フォールバック翻訳'}
                      </p>
                    </div>
                  ))}
                  {translationMessages.length === 0 && (
                    <p className={`text-gray-600 ${layoutMode === 'inverse' ? 'transform rotate-180' : ''}`}>
                      まだ翻訳結果はありません。音声認識が開始されると翻訳結果が表示されます。
                    </p>
                  )}
                  <div ref={translatedMessagesEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}