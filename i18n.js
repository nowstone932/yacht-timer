// TACK 다국어 문구와 음성 문장. 새 언어는 LANGS에 항목 하나를 추가하면 된다.
(function (root) {
'use strict';
const LANGS = {
  ko: {
    name: '한국어', tts: 'ko-KR',
    say: { min: n => `${n}분 전`, sec: n => String(n), start: '출발', synced: n => n === 0 ? '출발 신호에 맞춤' : `${n / 60}분 신호에 맞춤`, test: '음성 테스트. 삼, 이, 일.', armed: '부저 감지 대기', limit: l => `${l} 시간 도달` },
    ui: {
      tagline: '시선은 코스에, 시간은 귀로', ready: '출발 대기', toStart: '출발까지', racing: '경기 중', syncHint: '신호에 맞춰 누르기',
      minus: '−1초', plus: '+1초', reset: '초기화', undo: '되돌리기',
      micOn: '부저 감지 켜기', micOff: '부저 감지 끄기', micIdle: '마이크 꺼짐', micListening: '듣는 중', micArmed: '첫 부저를 기다리는 중', micDenied: '마이크 권한이 필요합니다', micUnsupported: '이 브라우저는 마이크를 지원하지 않습니다',
      sequence: '출발 순서', seq10: '10분 순서 (10·5·4·1·출발)', seq5: '5분 순서 (5·4·1·출발)',
      detected: s => `부저 감지 → ${s === 0 ? '출발' : s / 60 + '분'} 신호로 맞춤`, ignored: r => `부저 감지, 예상 신호와 맞지 않아 무시 (남은 ${r}초)`, rejected: '짧거나 잡음 같은 소리라 무시',
      plan: '안내 방식', planFixed: '기본', planFixedDesc: '1분 전까지는 매 분 "몇 분 전", 마지막 1분은 50·40초 후 30초부터 매초', planCustom: '직접 설정',
      minuteMode: '분 안내', every: '매 분', list: '지정한 분만', minutes: '안내할 분 (쉼표로 구분)', step: '마지막 1분 간격 안내', off: '끔', secEvery: n => `${n}초마다`, countFrom: '매초 카운트다운 시작 (초)',
      settings: '설정', language: '언어', voice: '음성 안내', earphone: '이어폰 사용 (음성 안내 중에도 부저 감지)', voiceTest: '음성 테스트', practice: '30초 연습', delay: '버튼 반응 지연 (초)', delayNote: '사람이 신호를 듣고 누르기까지의 시간을 뺍니다. 부저 감지에는 적용하지 않습니다.',
      sensitivity: '부저 감지 감도', sensHigh: '높음 (조용한 곳)', sensNormal: '보통', sensLow: '낮음 (바람·소음 많음)', micOffset: '부저 감지 보정 (초)', micOffsetNote: '본부선과 멀면 소리가 늦게 옵니다. 100m당 약 0.3초.', tolerance: '부저 허용 오차 (초)',
      race: '경기 중 기능', raceLimit: '경기 제한 (분)', markLimit: '첫 마크 제한 (분)', finishWindow: '피니시 윈도우 (분)', apply: '적용', markBtn: '첫 마크 통과', finishBtn: '선두 피니시', off2: '꺼짐', waiting: '대기', reached: '도달', passed: '통과', raceNote: '예시 값입니다. 경기 공고·지시서를 확인하세요.',
      log: '기록', noVoice: '이 언어의 음성이 기기에 없을 수 있습니다', warn: '실전 전 공식 신호와 비교해 확인하세요. 공식 기준은 시각 신호입니다.', hidden: '백그라운드에서는 음성과 감지가 멈춥니다', wake: '화면 꺼짐 방지 켜짐',
      afterStart: '출발 후 기록할 수 있습니다', settingsApplied: '설정 적용됨', badTime: '시간은 0 초과 1440분 이하 또는 빈칸', badInput: '시간 또는 지연값을 확인하세요', undone: '마지막 자동 맞춤을 되돌림'
    }
  },
  en: {
    name: 'English', tts: 'en-US',
    say: { min: n => n === 1 ? 'One minute' : `${n} minutes`, sec: n => String(n), start: 'Start', synced: n => n === 0 ? 'Synced to start' : `Synced to ${n / 60} minutes`, test: 'Voice test. Three, two, one.', armed: 'Listening for horn', limit: l => `${l} reached` },
    ui: {
      tagline: 'Eyes on the course, time in your ear', ready: 'Ready', toStart: 'To start', racing: 'Racing', syncHint: 'Tap on the signal',
      minus: '−1s', plus: '+1s', reset: 'Reset', undo: 'Undo',
      micOn: 'Horn detection on', micOff: 'Horn detection off', micIdle: 'Mic off', micListening: 'Listening', micArmed: 'Waiting for first horn', micDenied: 'Microphone permission needed', micUnsupported: 'Microphone not supported in this browser',
      sequence: 'Start sequence', seq10: '10-min (10·5·4·1·start)', seq5: '5-min (5·4·1·start)',
      detected: s => `Horn → synced to ${s === 0 ? 'start' : s / 60 + ' min'}`, ignored: r => `Horn ignored, no matching signal (${r}s left)`, rejected: 'Ignored: too short or noise-like',
      plan: 'Callouts', planFixed: 'Standard', planFixedDesc: 'Every minute until 1 min, then 50, 40 and every second from 30', planCustom: 'Custom',
      minuteMode: 'Minute calls', every: 'Every minute', list: 'Only these', minutes: 'Minutes (comma separated)', step: 'Interval in last minute', off: 'Off', secEvery: n => `Every ${n}s`, countFrom: 'Count every second from (s)',
      settings: 'Settings', language: 'Language', voice: 'Voice', earphone: 'Using earphones (detect horns during voice)', voiceTest: 'Test voice', practice: '30s practice', delay: 'Button reaction delay (s)', delayNote: 'Subtracts your reaction time when you tap. Not used for horn detection.',
      sensitivity: 'Horn sensitivity', sensHigh: 'High (quiet)', sensNormal: 'Normal', sensLow: 'Low (wind, noise)', micOffset: 'Horn offset (s)', micOffsetNote: 'Sound arrives late from far away: about 0.3 s per 100 m.', tolerance: 'Horn tolerance (s)',
      race: 'Race tools', raceLimit: 'Time limit (min)', markLimit: 'First mark limit (min)', finishWindow: 'Finish window (min)', apply: 'Apply', markBtn: 'First mark rounded', finishBtn: 'First boat finished', off2: 'Off', waiting: 'Waiting', reached: 'Reached', passed: 'Rounded', raceNote: 'Sample values. Check the notice of race and sailing instructions.',
      log: 'Log', noVoice: 'No voice for this language may be installed', warn: 'Verify against official signals before racing. Visual signals are official.', hidden: 'Voice and detection pause in background', wake: 'Screen kept awake',
      afterStart: 'Available after the start', settingsApplied: 'Settings applied', badTime: 'Use 0–1440 minutes or leave blank', badInput: 'Check time or delay', undone: 'Last auto sync undone'
    }
  },
  ja: {
    name: '日本語', tts: 'ja-JP',
    say: { min: n => `${n}分前`, sec: n => String(n), start: 'スタート', synced: n => n === 0 ? 'スタートに同期' : `${n / 60}分に同期`, test: '音声テスト。さん、に、いち。', armed: 'ホーン待機', limit: l => `${l}に到達` },
    ui: {
      tagline: '目はコースに、時間は耳で', ready: '待機', toStart: 'スタートまで', racing: 'レース中', syncHint: '信号に合わせてタップ',
      minus: '−1秒', plus: '+1秒', reset: 'リセット', undo: '元に戻す',
      micOn: 'ホーン検出オン', micOff: 'ホーン検出オフ', micIdle: 'マイクオフ', micListening: '検出中', micArmed: '最初のホーンを待機中', micDenied: 'マイクの許可が必要です', micUnsupported: 'このブラウザはマイク非対応です',
      sequence: 'スタート手順', seq10: '10分 (10·5·4·1·スタート)', seq5: '5分 (5·4·1·スタート)',
      detected: s => `ホーン検出 → ${s === 0 ? 'スタート' : s / 60 + '分'}に同期`, ignored: r => `ホーンを無視 (残り${r}秒、該当信号なし)`, rejected: '短い音・雑音として無視',
      plan: 'アナウンス', planFixed: '標準', planFixedDesc: '1分前まで毎分、最後の1分は50・40秒、30秒から毎秒', planCustom: 'カスタム',
      minuteMode: '分の通知', every: '毎分', list: '指定した分のみ', minutes: '通知する分 (カンマ区切り)', step: '最後の1分の間隔', off: 'オフ', secEvery: n => `${n}秒ごと`, countFrom: '毎秒カウント開始 (秒)',
      settings: '設定', language: '言語', voice: '音声', earphone: 'イヤホン使用 (音声中もホーン検出)', voiceTest: '音声テスト', practice: '30秒練習', delay: 'ボタン反応遅れ (秒)', delayNote: '信号を聞いて押すまでの時間を差し引きます。ホーン検出には使いません。',
      sensitivity: 'ホーン感度', sensHigh: '高 (静か)', sensNormal: '標準', sensLow: '低 (風・騒音)', micOffset: 'ホーン補正 (秒)', micOffsetNote: '遠いほど音は遅れます。100mで約0.3秒。', tolerance: 'ホーン許容誤差 (秒)',
      race: 'レース機能', raceLimit: 'タイムリミット (分)', markLimit: '第1マーク制限 (分)', finishWindow: 'フィニッシュウィンドウ (分)', apply: '適用', markBtn: '第1マーク通過', finishBtn: '先頭フィニッシュ', off2: 'オフ', waiting: '待機', reached: '到達', passed: '通過', raceNote: '例の値です。帆走指示書を確認してください。',
      log: '記録', noVoice: 'この言語の音声がない可能性があります', warn: 'レース前に公式信号と照合してください。公式は視覚信号です。', hidden: 'バックグラウンドでは音声と検出が停止します', wake: '画面スリープ防止オン',
      afterStart: 'スタート後に記録できます', settingsApplied: '設定を適用', badTime: '0〜1440分または空欄', badInput: '時間または遅れを確認', undone: '自動同期を元に戻しました'
    }
  },
  zh: {
    name: '中文', tts: 'zh-CN',
    say: { min: n => `还有${n}分钟`, sec: n => String(n), start: '出发', synced: n => n === 0 ? '已对准出发' : `已对准${n / 60}分钟信号`, test: '语音测试。三，二，一。', armed: '等待号角', limit: l => `${l}已到` },
    ui: {
      tagline: '眼睛看航线，时间听耳机', ready: '待命', toStart: '距出发', racing: '比赛中', syncHint: '听到信号时点按',
      minus: '−1秒', plus: '+1秒', reset: '重置', undo: '撤销',
      micOn: '开启号角检测', micOff: '关闭号角检测', micIdle: '麦克风关闭', micListening: '监听中', micArmed: '等待第一声号角', micDenied: '需要麦克风权限', micUnsupported: '此浏览器不支持麦克风',
      sequence: '起航程序', seq10: '10分钟 (10·5·4·1·出发)', seq5: '5分钟 (5·4·1·出发)',
      detected: s => `检测到号角 → 对准${s === 0 ? '出发' : s / 60 + '分钟'}`, ignored: r => `号角已忽略 (剩余${r}秒，无对应信号)`, rejected: '过短或像噪音，已忽略',
      plan: '播报方式', planFixed: '标准', planFixedDesc: '1分钟前每分钟播报，最后1分钟播报50、40秒，30秒起每秒', planCustom: '自定义',
      minuteMode: '分钟播报', every: '每分钟', list: '仅指定分钟', minutes: '播报分钟 (逗号分隔)', step: '最后1分钟间隔', off: '关', secEvery: n => `每${n}秒`, countFrom: '每秒倒数起点 (秒)',
      settings: '设置', language: '语言', voice: '语音', earphone: '使用耳机 (播报时也检测号角)', voiceTest: '语音测试', practice: '30秒练习', delay: '按键反应延迟 (秒)', delayNote: '扣除听到信号到按下的时间。号角检测不使用。',
      sensitivity: '号角灵敏度', sensHigh: '高 (安静)', sensNormal: '中', sensLow: '低 (风大、嘈杂)', micOffset: '号角校正 (秒)', micOffsetNote: '距离越远声音越晚，约每100米0.3秒。', tolerance: '号角容差 (秒)',
      race: '比赛功能', raceLimit: '比赛时限 (分)', markLimit: '第一标时限 (分)', finishWindow: '终点窗口 (分)', apply: '应用', markBtn: '绕过第一标', finishBtn: '首船完赛', off2: '关', waiting: '等待', reached: '已到', passed: '已绕过', raceNote: '示例数值，请以竞赛通知和航行细则为准。',
      log: '记录', noVoice: '设备可能没有此语言的语音', warn: '比赛前请与官方信号核对。以视觉信号为准。', hidden: '后台时语音和检测暂停', wake: '屏幕常亮已开启',
      afterStart: '出发后才能记录', settingsApplied: '设置已应用', badTime: '请输入0–1440分钟或留空', badInput: '请检查时间或延迟', undone: '已撤销上次自动对时'
    }
  },
  es: {
    name: 'Español', tts: 'es-ES',
    say: { min: n => n === 1 ? 'Un minuto' : `${n} minutos`, sec: n => String(n), start: 'Salida', synced: n => n === 0 ? 'Sincronizado con la salida' : `Sincronizado a ${n / 60} minutos`, test: 'Prueba de voz. Tres, dos, uno.', armed: 'Esperando bocina', limit: l => `${l} alcanzado` },
    ui: {
      tagline: 'Ojos en el campo, el tiempo al oído', ready: 'Preparado', toStart: 'Para la salida', racing: 'En regata', syncHint: 'Pulsa con la señal',
      minus: '−1s', plus: '+1s', reset: 'Reiniciar', undo: 'Deshacer',
      micOn: 'Activar detección de bocina', micOff: 'Desactivar detección', micIdle: 'Micrófono apagado', micListening: 'Escuchando', micArmed: 'Esperando la primera bocina', micDenied: 'Se necesita permiso de micrófono', micUnsupported: 'El navegador no admite micrófono',
      sequence: 'Secuencia', seq10: '10 min (10·5·4·1·salida)', seq5: '5 min (5·4·1·salida)',
      detected: s => `Bocina → sincronizado a ${s === 0 ? 'salida' : s / 60 + ' min'}`, ignored: r => `Bocina ignorada, sin señal (${r}s)`, rejected: 'Ignorado: corto o ruido',
      plan: 'Avisos', planFixed: 'Estándar', planFixedDesc: 'Cada minuto hasta 1 min; luego 50, 40 y cada segundo desde 30', planCustom: 'Personalizado',
      minuteMode: 'Avisos de minuto', every: 'Cada minuto', list: 'Solo estos', minutes: 'Minutos (separados por comas)', step: 'Intervalo en el último minuto', off: 'No', secEvery: n => `Cada ${n}s`, countFrom: 'Cuenta cada segundo desde (s)',
      settings: 'Ajustes', language: 'Idioma', voice: 'Voz', earphone: 'Con auriculares (detectar durante la voz)', voiceTest: 'Probar voz', practice: 'Práctica 30s', delay: 'Retraso al pulsar (s)', delayNote: 'Resta tu tiempo de reacción al pulsar. No se usa con la bocina.',
      sensitivity: 'Sensibilidad', sensHigh: 'Alta (silencio)', sensNormal: 'Normal', sensLow: 'Baja (viento, ruido)', micOffset: 'Corrección bocina (s)', micOffsetNote: 'El sonido llega tarde desde lejos: ~0,3 s cada 100 m.', tolerance: 'Tolerancia bocina (s)',
      race: 'Herramientas de regata', raceLimit: 'Tiempo límite (min)', markLimit: 'Límite 1.ª baliza (min)', finishWindow: 'Ventana de llegada (min)', apply: 'Aplicar', markBtn: '1.ª baliza', finishBtn: 'Primer barco llegó', off2: 'No', waiting: 'Espera', reached: 'Alcanzado', passed: 'Pasada', raceNote: 'Valores de ejemplo. Consulta las instrucciones de regata.',
      log: 'Registro', noVoice: 'Puede que no haya voz para este idioma', warn: 'Verifica con las señales oficiales. Las visuales son las oficiales.', hidden: 'Voz y detección en pausa en segundo plano', wake: 'Pantalla siempre encendida',
      afterStart: 'Disponible tras la salida', settingsApplied: 'Ajustes aplicados', badTime: 'Usa 0–1440 min o deja vacío', badInput: 'Revisa tiempo o retraso', undone: 'Sincronización deshecha'
    }
  },
  fr: {
    name: 'Français', tts: 'fr-FR',
    say: { min: n => n === 1 ? 'Une minute' : `${n} minutes`, sec: n => String(n), start: 'Départ', synced: n => n === 0 ? 'Calé sur le départ' : `Calé sur ${n / 60} minutes`, test: 'Test vocal. Trois, deux, un.', armed: 'En attente de la corne', limit: l => `${l} atteint` },
    ui: {
      tagline: 'Les yeux sur le parcours, le temps à l’oreille', ready: 'Prêt', toStart: 'Avant le départ', racing: 'En course', syncHint: 'Appuyez au signal',
      minus: '−1 s', plus: '+1 s', reset: 'Réinitialiser', undo: 'Annuler',
      micOn: 'Détection de corne', micOff: 'Arrêter la détection', micIdle: 'Micro coupé', micListening: 'À l’écoute', micArmed: 'En attente de la 1re corne', micDenied: 'Autorisation micro requise', micUnsupported: 'Micro non pris en charge',
      sequence: 'Procédure', seq10: '10 min (10·5·4·1·départ)', seq5: '5 min (5·4·1·départ)',
      detected: s => `Corne → calé sur ${s === 0 ? 'départ' : s / 60 + ' min'}`, ignored: r => `Corne ignorée, aucun signal (${r} s)`, rejected: 'Ignoré : trop court ou bruit',
      plan: 'Annonces', planFixed: 'Standard', planFixedDesc: 'Chaque minute jusqu’à 1 min, puis 50, 40 et chaque seconde dès 30', planCustom: 'Personnalisé',
      minuteMode: 'Annonces des minutes', every: 'Chaque minute', list: 'Seulement celles-ci', minutes: 'Minutes (séparées par des virgules)', step: 'Intervalle dernière minute', off: 'Non', secEvery: n => `Toutes les ${n} s`, countFrom: 'Compte chaque seconde dès (s)',
      settings: 'Réglages', language: 'Langue', voice: 'Voix', earphone: 'Écouteurs (détection pendant la voix)', voiceTest: 'Tester la voix', practice: 'Essai 30 s', delay: 'Délai de réaction (s)', delayNote: 'Retire votre temps de réaction à l’appui. Non utilisé pour la corne.',
      sensitivity: 'Sensibilité corne', sensHigh: 'Haute (calme)', sensNormal: 'Normale', sensLow: 'Basse (vent, bruit)', micOffset: 'Correction corne (s)', micOffsetNote: 'Le son arrive en retard de loin : ~0,3 s par 100 m.', tolerance: 'Tolérance corne (s)',
      race: 'Outils de course', raceLimit: 'Temps limite (min)', markLimit: 'Limite 1re marque (min)', finishWindow: 'Fenêtre d’arrivée (min)', apply: 'Appliquer', markBtn: '1re marque passée', finishBtn: 'Premier arrivé', off2: 'Non', waiting: 'Attente', reached: 'Atteint', passed: 'Passée', raceNote: 'Valeurs d’exemple. Vérifiez les instructions de course.',
      log: 'Journal', noVoice: 'Aucune voix installée pour cette langue peut-être', warn: 'Vérifiez avec les signaux officiels. Les signaux visuels font foi.', hidden: 'Voix et détection en pause en arrière-plan', wake: 'Écran maintenu allumé',
      afterStart: 'Disponible après le départ', settingsApplied: 'Réglages appliqués', badTime: '0–1440 min ou vide', badInput: 'Vérifiez temps ou délai', undone: 'Calage auto annulé'
    }
  }
};
// 문장 만들기: event = {kind:'min'|'sec'|'start', n}
function phrase(lang, event) {
  const s = (LANGS[lang] || LANGS.ko).say;
  if (event.kind === 'min') return s.min(event.n);
  if (event.kind === 'sec') return s.sec(event.n);
  if (event.kind === 'start') return s.start;
  return '';
}
const api = { LANGS, phrase };
if (typeof module !== 'undefined') module.exports = api; else root.TackI18n = api;
})(globalThis);
