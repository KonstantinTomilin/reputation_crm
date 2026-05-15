import { useState } from 'react';

const faqs = [
  {
    q: 'Сколько времени занимает удаление негатива?',
    a: 'Сроки зависят от объёма и типа материалов. Простые случаи — от 2 недель, комплексные SERM-проекты — от 2 до 6 месяцев. На первичной консультации я даю реалистичный прогноз под конкретную ситуацию.',
  },
  {
    q: 'Можно ли удалить статью из Google или Яндекс?',
    a: 'Да, в большинстве случаев это возможно. Применяются несколько методов: юридическое давление на площадку, запрос на удаление через форму поиска, SERM-вытеснение. Конкретный инструмент зависит от площадки и содержания материала.',
  },
  {
    q: 'Работаете ли вы с физическими лицами?',
    a: 'Да, работаю как с бизнесом, так и с частными лицами: топ-менеджерами, публичными людьми, политиками, предпринимателями. Для каждого клиента — персональная стратегия.',
  },
  {
    q: 'Как гарантируется конфиденциальность?',
    a: 'Подписываю NDA со всеми клиентами. Не раскрываю имена клиентов, детали проектов и применяемые методы. Конфиденциальность — ключевой принцип работы.',
  },
  {
    q: 'Что входит в услугу управления репутацией?',
    a: 'Полный цикл: мониторинг упоминаний, удаление негатива, вытеснение нежелательного контента из ТОП, создание позитивных материалов, работа с отзывами, PR в СМИ. Состав работ определяется индивидуально.',
  },
  {
    q: 'Как начать работу?',
    a: 'Напишите мне через форму обратной связи или мессенджер. На первичной бесплатной консультации я изучу ситуацию, оценю масштаб задачи и предложу оптимальное решение с реалистичными сроками и стоимостью.',
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-[#0d1b2a] py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-14 items-start">
          {/* Left */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#e8001d]" />
              <span className="text-[#e8001d] text-xs font-semibold uppercase tracking-widest">
                FAQ
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
              Часто задаваемые<br />
              <span className="text-[#e8001d]">вопросы</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-10">
              Не нашли ответ? Напишите мне — отвечу лично и подробно в течение часа.
            </p>
            <a
              href="#contacts"
              onClick={(e) => {
                e.preventDefault();
                const el = document.querySelector('#contacts');
                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#e8001d] text-white font-semibold text-sm rounded-md hover:bg-[#c40019] transition-colors cursor-pointer whitespace-nowrap"
            >
              Задать вопрос
              <i className="ri-arrow-right-line" />
            </a>

            {/* Decorative */}
            <div className="mt-14 grid grid-cols-2 gap-4">
              {[
                { icon: 'ri-time-line', label: 'Консультация бесплатно' },
                { icon: 'ri-lock-line', label: 'NDA с каждым клиентом' },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#e8001d]/15">
                    <i className={`${item.icon} text-[#e8001d]`} />
                  </div>
                  <div className="text-white/70 text-xs font-medium leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Accordion */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl border transition-all duration-300 ${
                  open === i
                    ? 'border-[#e8001d]/40 bg-white/5'
                    : 'border-white/10 bg-white/3 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                >
                  <span className={`font-semibold text-sm leading-snug transition-colors ${open === i ? 'text-white' : 'text-white/70'}`}>
                    {faq.q}
                  </span>
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all ${open === i ? 'bg-[#e8001d] rotate-45' : 'bg-white/10'}`}>
                    <i className="ri-add-line text-white" />
                  </div>
                </button>
                {open === i && (
                  <div className="px-6 pb-6 text-white/55 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
