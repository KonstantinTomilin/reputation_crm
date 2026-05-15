import { useState } from 'react';

const cases = [
  {
    id: 1,
    category: 'Бизнес',
    client: 'Крупный ритейлер',
    title: 'Удаление 47 негативных материалов',
    challenge: 'Конкуренты организовали массированную информационную атаку: заказные статьи на новостных порталах, негативные отзывы на маркетплейсах, фейковые публикации в Telegram-каналах.',
    solution: 'Разработали стратегию из трёх этапов: юридическое удаление явно незаконных материалов, SERM-вытеснение остальных, создание позитивного информационного фона через СМИ.',
    results: ['47 материалов удалено', 'ТОП-10 очищен за 3 месяца', 'Рост продаж на 23%'],
    duration: '3 месяца',
    image: 'https://readdy.ai/api/search-image?query=professional%20business%20meeting%20dark%20navy%20corporate%20office%20executives%20discussing%20strategy%20clean%20minimal%20background%20suit%20and%20tie%20serious%20professional%20atmosphere%20no%20text&width=600&height=400&seq=case1&orientation=landscape',
  },
  {
    id: 2,
    category: 'Личный бренд',
    client: 'Топ-менеджер',
    title: 'Репутация генерального директора',
    challenge: 'После скандальной публикации в одном из федеральных изданий клиент получил шквал негатива в поиске. Партнёры и инвесторы начали отказываться от встреч.',
    solution: 'Оперативный антикризисный PR: официальный комментарий через РБК, серия экспертных колонок, работа с Википедией и профессиональными профилями.',
    results: ['Публикация удалена', 'Forbes, РБК — экспертные колонки', 'Восстановлены 3 крупных партнёрства'],
    duration: '6 недель',
    image: 'https://readdy.ai/api/search-image?query=confident%20businessman%20portrait%20dark%20background%20professional%20headshot%20executive%20director%20sharp%20suit%20minimal%20studio%20lighting%20authoritative%20expression&width=600&height=400&seq=case2&orientation=landscape',
  },
  {
    id: 3,
    category: 'Медицина',
    client: 'Сеть клиник',
    title: 'Управление отзывами для 12 клиник',
    challenge: 'Конкурент систематически размещал фиктивные негативные отзывы на всех ключевых площадках. Средний рейтинг упал с 4.7 до 3.1 за 4 месяца.',
    solution: 'Юридическое удаление фальшивых отзывов, работа с реальными пациентами для формирования органической обратной связи, SEO-работа с поисковой выдачей.',
    results: ['Рейтинг: 3.1 → 4.9', '200+ фейков удалено', '+34% новых пациентов'],
    duration: '4 месяца',
    image: 'https://readdy.ai/api/search-image?query=modern%20medical%20clinic%20interior%20reception%20clean%20white%20professional%20healthcare%20facility%20bright%20minimal%20no%20people%20sterile%20environment&width=600&height=400&seq=case3&orientation=landscape',
  },
];

export default function CasesSection() {
  const [active, setActive] = useState(0);

  const c = cases[active];

  return (
    <section id="cases" className="bg-[#f7f7f7] py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e8001d]" />
            <span className="text-[#e8001d] text-xs font-semibold uppercase tracking-widest">
              Кейсы
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0d1b2a] leading-tight">
            Реальные результаты<br />
            <span className="text-[#e8001d]">реальных клиентов</span>
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-10">
          {cases.map((cs, i) => (
            <button
              key={cs.id}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                active === i
                  ? 'bg-[#e8001d] text-white'
                  : 'bg-white text-[#0d1b2a] border border-gray-200 hover:border-[#e8001d]/40'
              }`}
            >
              {cs.title}
            </button>
          ))}
        </div>

        {/* Case detail */}
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image */}
            <div className="h-64 lg:h-auto relative">
              <img
                src={c.image}
                alt={c.title}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d1b2a]/60 to-transparent" />
              <div className="absolute top-6 left-6">
                <span className="bg-[#e8001d] text-white text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
                  {c.category}
                </span>
              </div>
              <div className="absolute bottom-6 left-6">
                <div className="text-white/60 text-xs mb-1">Клиент</div>
                <div className="text-white font-semibold">{c.client}</div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-gray-400 uppercase tracking-widest">Срок: {c.duration}</span>
                </div>
                <h3 className="text-xl font-bold text-[#0d1b2a] mb-6">{c.title}</h3>

                <div className="mb-5">
                  <div className="text-xs font-semibold text-[#e8001d] uppercase tracking-widest mb-2">Задача</div>
                  <p className="text-gray-600 text-sm leading-relaxed">{c.challenge}</p>
                </div>
                <div className="mb-6">
                  <div className="text-xs font-semibold text-[#0d1b2a] uppercase tracking-widest mb-2">Решение</div>
                  <p className="text-gray-600 text-sm leading-relaxed">{c.solution}</p>
                </div>
              </div>

              {/* Results */}
              <div className="border-t border-gray-100 pt-6">
                <div className="text-xs font-semibold text-[#0d1b2a] uppercase tracking-widest mb-4">Результаты</div>
                <div className="flex flex-wrap gap-3">
                  {c.results.map((r) => (
                    <div key={r} className="flex items-center gap-2 bg-[#f7f7f7] rounded-lg px-4 py-2">
                      <i className="ri-checkbox-circle-fill text-[#e8001d] text-sm" />
                      <span className="text-sm font-medium text-[#0d1b2a] whitespace-nowrap">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-3 mt-8">
          {cases.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`transition-all cursor-pointer rounded-full ${
                active === i ? 'w-8 h-2 bg-[#e8001d]' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
