import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MessageCircleReply,
  ShieldCheck,
  CornerDownRight,
  Trash2,
  Edit3
} from 'lucide-react';
import {
  FeedbackMessage,
  getLocalMessages,
  sendFeedbackMessage,
  getOrCreateDeviceId,
  replyToFeedbackMessage,
  deleteFeedbackMessage
} from '../services/feedback';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'inbox'>('send');
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('pocket_business_name') || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMessages(getLocalMessages());
      setStatusMessage(null);
      setReplyingToId(null);
      setReplyText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartReply = (msg: FeedbackMessage) => {
    setReplyingToId(msg.id);
    setReplyText(msg.reply || '');
  };

  const handleSaveReply = (msgId: string) => {
    if (!replyText.trim()) return;
    const res = replyToFeedbackMessage(msgId, replyText);
    if (res.success) {
      playSuccessBeep();
      setMessages(getLocalMessages());
      setReplyingToId(null);
      setReplyText('');
    } else {
      playErrorBuzzer();
      alert(res.message);
    }
  };

  const handleDeleteMsg = (msgId: string) => {
    if (window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
      deleteFeedbackMessage(msgId);
      setMessages(getLocalMessages());
      playSuccessBeep();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const res = await sendFeedbackMessage(businessName, subject, message);

      if (res.success) {
        playSuccessBeep();
        localStorage.setItem('pocket_business_name', businessName.trim());
        setSubject('');
        setMessage('');
        setMessages(getLocalMessages());
        setStatusMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setActiveTab('inbox');
          setStatusMessage(null);
        }, 1500);
      } else {
        playErrorBuzzer();
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch {
      playErrorBuzzer();
      setStatusMessage({ type: 'error', text: 'Mesaj gönderilirken hata oluştu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = messages.filter((m) => m.reply).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Üst Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Destek & Geri Bildirim</h3>
              <p className="text-[11px] text-slate-400">Geliştirici ekiple doğrudan iletişim</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sekme Seçici: Mesaj Gönder / Yanıtlarım */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 my-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'send'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Mesaj Yaz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'inbox'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageCircleReply className="w-3.5 h-3.5" />
            <span>Mesajlarım & Yanıtlar ({messages.length})</span>
          </button>
        </div>

        {/* Gövde */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'send' ? (
            /* MESAJ GÖNDERME FORMU */
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" /> İşletme Adı / Ünvanınız *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Örn: Özkan Hırdavat San. Tic."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-teal-400" /> Konu *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Örn: Sayımda yeni özellik önerisi / Hata bildirimi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-400" /> Mesajınız *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Yaşadığınız sorunu veya eklenmesini istediğiniz özelliği detaylıca yazabilirsiniz..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2 text-[10px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Üyelik veya şifre gerekmez. Cihazınıza özel anonim kimlik ile mesajınız iletilir ve cevabınız bu ekrana düşer.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Gönderiliyor...' : 'Mesajı Gönder'}</span>
              </button>
            </form>
          ) : (
            /* MESAJLARIM & YANITLAR LİSTESİ */
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Henüz gönderilmiş bir mesajınız bulunmuyor.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-white text-xs block leading-tight">{m.subject}</span>
                        <span className="text-[10px] text-teal-400 font-semibold">{m.businessName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      {m.message}
                    </p>

                    {/* Yönetici Yanıtı Varsa */}
                    {m.reply ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 animate-fade-in">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Geliştirici / Yönetici Yanıtı:</span>
                          </div>
                          {m.repliedAt && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              {new Date(m.repliedAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-100/90 leading-relaxed whitespace-pre-wrap">{m.reply}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-medium pt-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>İletildi, inceleme / yanıt bekleniyor...</span>
                      </div>
                    )}

                    {/* Yanıt Yazma Formu (Aktifse) */}
                    {replyingToId === m.id ? (
                      <div className="p-3 rounded-xl bg-slate-900 border border-teal-500/40 space-y-2 mt-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Mesaja Cevap Ver:</span>
                        </div>
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Müşteriye / Kullanıcıya iletilecek cevabınızı yazın..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none leading-relaxed"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText('');
                            }}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[11px] font-medium"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveReply(m.id)}
                            className="py-1.5 px-3 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-md shadow-teal-500/20"
                          >
                            <Send className="w-3 h-3" />
                            <span>Cevabı Kaydet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Yanıt Butonları Çubuğu */
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() => handleStartReply(m)}
                          className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 transition-all active:scale-95"
                        >
                          {m.reply ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              <span>Cevabı Düzenle</span>
                            </>
                          ) : (
                            <>
                              <MessageCircleReply className="w-3.5 h-3.5" />
                              <span>Cevap Ver / Yanıtla</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMsg(m.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Mesajı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Alt Kapat Butonu */}
        <div className="pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs rounded-xl transition-all"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
