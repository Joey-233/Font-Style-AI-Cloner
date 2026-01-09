
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  Upload, 
  Type, 
  Wand2, 
  Download, 
  RefreshCcw, 
  AlertCircle,
  Sparkles,
  Layers,
  Info,
  Maximize2,
  Eye,
  Plus,
  Trash2,
  Zap,
  Settings,
  X,
  Check,
  ExternalLink
} from 'lucide-react';
import { AppState, GeneratedItem, StyleTransferParameters } from './types';
import { GeminiService } from './services/geminiService';

const RATIO_OPTIONS = ["1:1", "4:3", "3:2", "16:9", "2:1"];

const BUILT_IN_FONTS = [
  { name: '思源黑体', family: '"Source Han Sans CN", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@700&display=swap' },
  { name: '思源宋体', family: '"Source Han Serif CN", serif', url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap' },
  { name: '站酷黄油', family: '"ZCOOL QingKe HuangYou"', url: 'https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap' },
  { name: '站酷小薇', family: '"ZCOOL XiaoWei"', url: 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap' },
  { name: '站酷快乐', family: '"ZCOOL KuaiLe"', url: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' },
  { name: '马善政毛笔', family: '"Ma Shan Zheng"', url: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap' },
  { name: '指茫星', family: '"Zhi Mang Xing"', url: 'https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap' },
  { name: '刘建毛草', family: '"Liu Jian Mao Cao"', url: 'https://fonts.googleapis.com/css2?family=Liu+建+毛+草&display=swap' },
  { name: '龙仓', family: '"Long Cang"', url: 'https://fonts.googleapis.com/css2?family=Long+Cang&display=swap' },
  { name: '楷体', family: '"Noto Serif SC", serif', url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&display=swap' }
];

const App: React.FC = () => {
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [targetText, setTargetText] = useState('');
  const [fontTemplate, setFontTemplate] = useState<string | null>(null);
  const [isHighQuality, setIsHighQuality] = useState(false);
  const [ratioIndex, setRatioIndex] = useState(0);
  const [useIntelligentRatio, setUseIntelligentRatio] = useState(true);
  
  // API 设置相关状态
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'jimeng'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [jimengApiKey, setJimengApiKey] = useState(localStorage.getItem('jimeng_api_key') || '');

  const [selectedFont, setSelectedFont] = useState(BUILT_IN_FONTS[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const intelligentRatio = useMemo(() => {
    const len = targetText.trim().length;
    if (len <= 2) return "1:1";
    if (len <= 4) return "4:3";
    return "16:9";
  }, [targetText]);

  const selectedRatio = useMemo(() => {
    return useIntelligentRatio ? intelligentRatio : RATIO_OPTIONS[ratioIndex];
  }, [useIntelligentRatio, intelligentRatio, ratioIndex]);

  useEffect(() => {
    BUILT_IN_FONTS.forEach(font => {
      const link = document.createElement('link');
      link.href = font.url;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    localStorage.setItem('jimeng_api_key', jimengApiKey);
    setShowSettings(false);
  };

  const generateFontTemplate = useCallback(() => {
    if (!targetText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 2048;
    const height = 512;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const textToDraw = useIntelligentRatio ? targetText.replace(/\n/g, ' ') : targetText;
    const lines = textToDraw.split('\n');
    
    let fontSize = height * 0.7;
    ctx.font = `900 ${fontSize}px ${selectedFont.family}`;
    
    const maxLineWidth = width * 0.9;
    let currentLines = lines;
    
    const checkSize = () => {
      let overflow = false;
      currentLines.forEach(line => {
        if (ctx.measureText(line).width > maxLineWidth) overflow = true;
      });
      return overflow;
    };

    while (checkSize() && fontSize > 10) {
      fontSize -= 10;
      ctx.font = `900 ${fontSize}px ${selectedFont.family}`;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const totalHeight = currentLines.length * fontSize;
    const startY = height / 2 - (totalHeight / 2) + (fontSize / 2);

    currentLines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * fontSize);
    });

    const dataUrl = canvas.toDataURL('image/png');
    setFontTemplate(dataUrl);
    return dataUrl;
  }, [targetText, selectedFont, useIntelligentRatio]);

  useEffect(() => {
    if (fontTemplate && targetText) {
      generateFontTemplate();
    }
  }, [targetText, selectedFont, useIntelligentRatio]);

  const runGeneration = async (params: StyleTransferParameters, taskId: string) => {
    try {
      const currentGeminiKey = localStorage.getItem('gemini_api_key') || '';
      const imageUrl = await GeminiService.generateStyledText(
        params.referenceImage,
        params.fontTemplate,
        params.targetText,
        params.isHighQuality,
        params.selectedRatio,
        currentGeminiKey
      );
      setResults(prev => prev.map(item => 
        item.id === taskId ? { ...item, status: 'success', imageUrl } : item
      ));
    } catch (err: any) {
      setResults(prev => prev.map(item => 
        item.id === taskId ? { ...item, status: 'error' } : item
      ));
    }
  };

  const handleGenerate = async () => {
    if (!referenceImage || !targetText) return;
    let currentTemplate = fontTemplate || generateFontTemplate() || null;
    if (!currentTemplate) return;

    // 如果是 Gemini 且没有设置 Key 且环境变量也没有
    if (selectedProvider === 'gemini' && !geminiApiKey && !process.env.API_KEY) {
      setShowSettings(true);
      return;
    }

    const taskId = Math.random().toString(36).substring(7);
    const newParams: StyleTransferParameters = {
      referenceImage,
      fontTemplate: currentTemplate,
      targetText: useIntelligentRatio ? targetText.replace(/\n/g, ' ') : targetText,
      isHighQuality,
      selectedRatio
    };

    const newItem: GeneratedItem = {
      id: taskId,
      ...newParams,
      imageUrl: null,
      status: 'generating',
      timestamp: Date.now()
    };

    setResults(prev => [newItem, ...prev]);
    document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
    runGeneration(newParams, taskId);
  };

  const handleRegenerate = (item: GeneratedItem) => {
    const taskId = Math.random().toString(36).substring(7);
    const newItem: GeneratedItem = {
      id: taskId,
      referenceImage: item.referenceImage,
      fontTemplate: item.fontTemplate,
      targetText: item.targetText,
      isHighQuality: item.isHighQuality,
      selectedRatio: item.selectedRatio,
      imageUrl: null,
      status: 'generating',
      timestamp: Date.now()
    };
    setResults(prev => [newItem, ...prev]);
    runGeneration({
      referenceImage: item.referenceImage,
      fontTemplate: item.fontTemplate,
      targetText: item.targetText,
      isHighQuality: item.isHighQuality,
      selectedRatio: item.selectedRatio
    }, taskId);
  };

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(item => item.id !== id));
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fontName = `CustomFont-${Date.now()}`;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const fontFace = new FontFace(fontName, buffer);
        try {
          await fontFace.load();
          document.fonts.add(fontFace);
          setSelectedFont({ name: '自定义', family: fontName, url: '' });
        } catch (err) {
          alert("字体加载失败");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadTransparent = (imageUrl: string, filename: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const baseAlpha = Math.max(r, g, b); 
          const sensitivity = 2.5;
          const alphaValue = Math.min(255, baseAlpha * sensitivity);
          data[i + 3] = alphaValue;
          if (alphaValue > 0) {
              const factor = 255 / alphaValue;
              data[i]     = Math.min(255, r * factor);
              data[i + 1] = Math.min(255, g * factor);
              data[i + 2] = Math.min(255, b * factor);
          }
      }

      ctx.putImageData(imageData, 0, 0);
      const link = document.createElement('a');
      link.download = filename || 'transparent_result.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = imageUrl;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 md:p-8 max-w-6xl mx-auto font-sans relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Settings Button */}
      <button 
        onClick={() => setShowSettings(true)}
        className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl glass hover:bg-white/10 transition-all group border border-white/10 flex items-center gap-2"
      >
        <Settings className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        <span className="text-xs font-bold tracking-tight text-white/60 group-hover:text-white transition-colors">配制API</span>
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md glass rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold tracking-tight">API 服务配置</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">选择 AI 引擎</label>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setSelectedProvider('gemini')}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedProvider === 'gemini' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Gemini 3</div>
                        <div className="text-[10px] text-white/30">Google 原生多模态模型</div>
                      </div>
                    </div>
                    {selectedProvider === 'gemini' && <Check className="w-5 h-5 text-purple-400" />}
                  </button>

                  <button 
                    onClick={() => setSelectedProvider('jimeng')}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedProvider === 'jimeng' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">即梦 AI (Jimeng)</div>
                        <div className="text-[10px] text-white/30">字节跳动 艺术字生成引擎</div>
                      </div>
                    </div>
                    {selectedProvider === 'jimeng' && <Check className="w-5 h-5 text-blue-400" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                {selectedProvider === 'gemini' ? (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Gemini API Key</label>
                    <input 
                      type="password" 
                      placeholder="填入您的 Gemini API 密钥..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                    />
                    <p className="text-[10px] text-white/20">密钥将加密存储于您的浏览器本地。若留空则尝试使用系统默认密钥。</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">即梦 API Key</label>
                    <input 
                      type="password" 
                      placeholder="填入您的 Jimeng API 密钥..."
                      value={jimengApiKey}
                      onChange={(e) => setJimengApiKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                    <p className="text-[10px] text-white/20">密钥将加密存储于您的浏览器本地。</p>
                  </div>
                )}
              </div>

              <button 
                onClick={saveSettings}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm shadow-xl hover:bg-white/90 transition-all active:scale-95"
              >
                保存并应用
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="w-full mb-8 flex flex-col items-center text-center pt-8">
        <div className="flex items-center gap-2 mb-4 px-4 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] uppercase tracking-widest text-white/40">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Joey的AI工具</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          字体样式 AI 复刻器
        </h1>
        <p className="text-white/20 text-sm font-light italic">智能视觉提取 · 精准轮廓复刻</p>
      </header>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="glass rounded-[2rem] p-6 flex flex-col h-[520px] transition-all border border-white/5 hover:bg-white/[0.04]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">1. 参考样式</h2>
          </div>
          <div className={`relative group flex-1 border border-dashed rounded-2xl flex items-center justify-center transition-all ${referenceImage ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 hover:border-white/20'}`}>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setReferenceImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            {referenceImage ? (
              <img src={referenceImage} alt="Reference" className="max-w-full max-h-full object-contain p-4 rounded-xl" />
            ) : (
              <div className="flex flex-col items-center text-center px-4 opacity-30">
                <Upload className="w-6 h-6 mb-2" />
                <p className="text-[10px]">上传样张：AI 将提取其材质、纹理 and 光影</p>
              </div>
            )}
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6 flex flex-col h-[520px] border border-white/5 hover:bg-white/[0.04] overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Type className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">2. 文字与形状</h2>
          </div>
          
          <div className="flex flex-col h-full gap-4">
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-white/20 uppercase tracking-tighter">内容输入</span>
                <label className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-white/30 border border-white/5">
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} className="hidden" />
                  <Plus className="w-2 h-2" /> 本地字体
                </label>
              </div>
              <textarea
                placeholder="请输入想要创作的文字..."
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                className="w-full flex-1 bg-white/[0.03] border border-white/5 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-lg resize-none placeholder:text-white/5"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-white/20 uppercase tracking-tighter px-1">内置字体库</span>
              <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto scrollbar-hide">
                {BUILT_IN_FONTS.map(font => (
                  <button
                    key={font.name}
                    onClick={() => setSelectedFont(font)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] border ${selectedFont.name === font.name ? 'bg-purple-500/20 border-purple-500/50 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[140px] flex flex-col gap-2">
              <span className="text-[10px] text-white/20 uppercase tracking-tighter px-1">
                形状预览（<span className="text-red-500 font-bold">一定记得点点点这里直到字体有变化！</span>）
              </span>
              <button 
                onClick={generateFontTemplate}
                className="relative flex-1 bg-black border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center"
              >
                {fontTemplate ? (
                  <img src={fontTemplate} alt="Font shape" className="h-full w-full object-contain p-4" />
                ) : (
                  <div className="opacity-10 flex flex-col items-center">
                    <Eye className="w-4 h-4" />
                    <span className="text-[8px] uppercase">确认轮廓</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="w-full mb-6 space-y-4">
        <div className="glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5">
          <div className="flex-1 max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/40">
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-xs uppercase">画布比例</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={useIntelligentRatio} 
                    onChange={(e) => setUseIntelligentRatio(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className={`text-[10px] uppercase tracking-widest ${useIntelligentRatio ? 'text-purple-400 font-bold' : 'text-white/20 group-hover:text-white/40'}`}>
                    智能比例
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                {useIntelligentRatio && <Zap className="w-3 h-3 text-purple-400 animate-pulse" />}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${useIntelligentRatio ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'bg-white/10 border-white/5 text-white'}`}>
                  {selectedRatio}
                </span>
              </div>
            </div>
            <div className={`relative pt-2 pb-6 transition-opacity duration-300 ${useIntelligentRatio ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <input 
                type="range" 
                min="0" 
                max="4" 
                step="1" 
                value={ratioIndex} 
                onChange={(e) => setRatioIndex(parseInt(e.target.value))} 
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500" 
              />
              <div className="absolute top-8 left-0 w-full flex justify-between px-1 text-[9px] text-white/10 uppercase">
                {RATIO_OPTIONS.map((r, i) => (
                  <span key={r} className={i === ratioIndex ? 'text-white/40' : ''}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group text-white/40 hover:text-white/60">
              <input type="checkbox" checked={isHighQuality} onChange={(e) => setIsHighQuality(e.target.checked)} className="w-5 h-5 rounded-lg accent-purple-600" />
              <span className="text-xs transition-colors">开启超高清渲染</span>
            </label>
            <button
              disabled={!referenceImage || !targetText || !fontTemplate}
              onClick={handleGenerate}
              className={`w-full sm:w-[260px] py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95 shadow-2xl ${
                !referenceImage || !targetText || !fontTemplate
                ? 'bg-white/5 text-white/10'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              }`}
            >
              <Wand2 className="w-5 h-5" />
              立即生成 ({selectedProvider === 'gemini' ? 'Gemini 3' : '即梦 AI'})
            </button>
          </div>
        </div>
      </section>

      <section id="result-section" className="w-full space-y-6 mb-12">
        <div className="flex items-center gap-3 px-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold tracking-widest uppercase text-white/60">任务队列 & 结果历史</h2>
        </div>

        {results.length === 0 ? (
          <div className="glass rounded-[2.5rem] p-16 flex flex-col items-center justify-center border border-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white/10" />
            </div>
            <p className="text-white/10 text-sm italic">暂无生成记录，点击下方生成您的第一个作品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((item) => (
              <div key={item.id} className="glass rounded-[2rem] p-6 border border-white/5 relative group flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">任务 #{item.id}</span>
                    <span className="text-[9px] text-white/10">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <button onClick={() => removeResult(item.id)} className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative aspect-video rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-white/5">
                  {item.status === 'generating' ? (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCcw className="w-8 h-8 text-purple-500 animate-spin" />
                      <span className="text-[10px] text-white/20 uppercase animate-pulse">渲染中...</span>
                    </div>
                  ) : item.status === 'error' ? (
                    <div className="flex flex-col items-center gap-2 text-red-500/40">
                      <AlertCircle className="w-8 h-8" />
                      <span className="text-[10px] uppercase">生成失败</span>
                    </div>
                  ) : (
                    <img src={item.imageUrl!} alt="Result" className="w-full h-full object-contain" />
                  )}

                  {item.status !== 'generating' && (
                    <button 
                      onClick={() => handleRegenerate(item)}
                      className="absolute bottom-4 right-4 p-3 bg-purple-600 rounded-2xl text-white shadow-xl shadow-black/50 hover:scale-110 active:scale-95 transition-all z-20 group/btn"
                      title="使用相同参数重新生成"
                    >
                      <RefreshCcw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/40 bg-white/5 p-3 rounded-xl">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <Type className="w-3 h-3" /> "{item.targetText}"
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> {item.selectedRatio}
                    </span>
                  </div>
                  {item.imageUrl && (
                    <button 
                      onClick={() => handleDownloadTransparent(item.imageUrl!, `transparent-style-${item.id}.png`)}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" /> 下载透明 PNG
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="w-full py-8 border-t border-white/5 flex flex-col items-center gap-2 text-white/10 text-[9px] tracking-[0.4em] uppercase">
        <p>© 2024 FONTSTYLE AI | 专业视觉排版风格迁移</p>
        <p>基于 Gemini-3 Vision 队列渲染系统</p>
      </footer>
    </div>
  );
};

export default App;
