import { useState } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function ContactsSection() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<FormState>('idle');
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'message') {
      if (value.length > 500) return;
      setCharCount(value.length);
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (charCount > 500) return;
    setStatus('loading');
    try {
      const body = new URLSearchParams();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      const res = await fetch('https://readdy.ai/api/form/d7kc4ai63r16okiqph0g', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', message: '' });
        setCharCount(0);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contacts" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#e8001d]" />
              <span className="text-[#e8001d] text-xs font-semibold uppercase tracking-widest">
                Контакты
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1b2a] leading-tight mb-6">
              Обсудим вашу<br />
              <span className="text-[#e8001d]">задачу</span>
            </h2>
            <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-md">
              Расскажите о проблеме — отвечу в течение часа. Первичная консультация бесплатна.
            </p>

            {/* Contact cards */}
            <div className="flex flex-col gap-4 mb-10">
              {[
                { icon: 'ri-telegram-line', label: 'Telegram', value: '@username', link: 'https://t.me/username' },
                { icon: 'ri-whatsapp-line', label: 'WhatsApp', value: '+7 (999) 000-00-00', link: '#' },
                { icon: 'ri-mail-line', label: 'Email', value: 'info@example.com', link: 'mailto:info@example.com' },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.link}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#e8001d]/30 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#0d1b2a]/5 group-hover:bg-[#e8001d]/10 transition-colors flex-shrink-0">
                    <i className={`${c.icon} text-[#0d1b2a] group-hover:text-[#e8001d] text-xl transition-colors`} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">{c.label}</div>
                    <div className="font-semibold text-[#0d1b2a] text-sm">{c.value}</div>
                  </div>
                  <i className="ri-arrow-right-line text-gray-300 group-hover:text-[#e8001d] ml-auto transition-colors" />
                </a>
              ))}
            </div>

            {/* Guarantee strip */}
            <div className="bg-[#0d1b2a] rounded-xl p-6 flex flex-col gap-3">
              <div className="text-white font-semibold text-sm">Гарантии работы</div>
              <div className="flex flex-col gap-2">
                {['Договор и NDA', 'Отчётность каждую неделю', 'Возврат при отсутствии результата'].map((g) => (
                  <div key={g} className="flex items-center gap-3">
                    <i className="ri-check-line text-[#e8001d] text-sm flex-shrink-0" />
                    <span className="text-white/60 text-sm">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right form */}
          <div className="bg-[#f7f7f7] rounded-xl p-8 md:p-10">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center text-center gap-5 py-12">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
                  <i className="ri-check-line text-green-600 text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-[#0d1b2a]">Сообщение отправлено!</h3>
                <p className="text-gray-500 text-sm">Отвечу в течение часа. Спасибо за обращение.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 bg-[#0d1b2a] text-white text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap"
                >
                  Отправить ещё
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-[#0d1b2a] mb-6">Напишите мне</h3>
                <form
                  id="contact-form"
                  data-readdy-form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        Имя
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Александр"
                        className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-sm text-[#0d1b2a] placeholder-gray-400 focus:outline-none focus:border-[#e8001d] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+7 (999) 000-00-00"
                        className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-sm text-[#0d1b2a] placeholder-gray-400 focus:outline-none focus:border-[#e8001d] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="mail@example.com"
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-sm text-[#0d1b2a] placeholder-gray-400 focus:outline-none focus:border-[#e8001d] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      Описание задачи
                    </label>
                    <textarea
                      name="message"
                      required
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Кратко опишите ситуацию..."
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-sm text-[#0d1b2a] placeholder-gray-400 focus:outline-none focus:border-[#e8001d] transition-colors resize-none"
                    />
                    <div className={`text-xs mt-1 text-right ${charCount > 480 ? 'text-[#e8001d]' : 'text-gray-400'}`}>
                      {charCount}/500
                    </div>
                  </div>

                  {status === 'error' && (
                    <div className="text-[#e8001d] text-sm font-medium">
                      Ошибка отправки. Пожалуйста, попробуйте снова.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3.5 bg-[#e8001d] text-white font-semibold rounded-md hover:bg-[#c40019] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {status === 'loading' ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
