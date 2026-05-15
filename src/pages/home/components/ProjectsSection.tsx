const projects = [
  {
    id: 1,
    tag: 'SERM',
    title: 'Очистка выдачи для топ-менеджера',
    desc: 'Полное удаление 23 негативных статей из ТОП-10 Google и Яндекс за 4 месяца. Клиент — генеральный директор крупного ритейлера.',
    result: '-100% негатива в ТОП-10',
    duration: '4 месяца',
    icon: 'ri-user-star-line',
  },
  {
    id: 2,
    tag: 'PR',
    title: 'PR-кампания для IT-стартапа',
    desc: 'Выход в Forbes, РБК и Коммерсантъ. Формирование экспертного образа основателей в digital-пространстве.',
    result: '12 публикаций в СМИ',
    duration: '3 месяца',
    icon: 'ri-newspaper-line',
  },
  {
    id: 3,
    tag: 'Кризис',
    title: 'Антикризисный PR для банка',
    desc: 'Управление репутацией в условиях информационной атаки. Снижение негативного фона на 87% за 6 недель.',
    result: '-87% негатива',
    duration: '6 недель',
    icon: 'ri-shield-line',
  },
  {
    id: 4,
    tag: 'Отзывы',
    title: 'Работа с отзывами для клиники',
    desc: 'Комплексная работа с 2ГИС, Google Maps, Яндекс.Картами и медицинскими порталами. Рейтинг вырос с 3.2 до 4.8.',
    result: '4.8 средний рейтинг',
    duration: '2 месяца',
    icon: 'ri-star-line',
  },
  {
    id: 5,
    tag: 'SERM',
    title: 'Репутация строительной компании',
    desc: 'Вытеснение 15 негативных публикаций из выдачи Яндекс через создание качественного контента и работу со ссылками.',
    result: '+15 позитивных материалов',
    duration: '5 месяцев',
    icon: 'ri-building-line',
  },
  {
    id: 6,
    tag: 'PR',
    title: 'Личный бренд для политика',
    desc: 'Формирование экспертного образа в федеральных СМИ, работа с Википедией и профильными порталами.',
    result: '20+ публикаций',
    duration: '8 месяцев',
    icon: 'ri-global-line',
  },
];

const tagColors: Record<string, string> = {
  SERM: 'bg-[#e8001d]/10 text-[#e8001d]',
  PR: 'bg-blue-500/10 text-blue-400',
  Кризис: 'bg-orange-500/10 text-orange-400',
  Отзывы: 'bg-green-500/10 text-green-400',
};

export default function ProjectsSection() {
  return (
    <section id="projects" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#e8001d]" />
              <span className="text-[#e8001d] text-xs font-semibold uppercase tracking-widest">
                Мои проекты
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1b2a] leading-tight">
              Более 1500 успешных<br />
              <span className="text-[#e8001d]">проектов</span> за 15 лет
            </h2>
          </div>
          <p className="text-gray-500 text-sm md:text-base max-w-sm leading-relaxed">
            Работаю с бизнесом и публичными людьми: от стартапов до федеральных компаний.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group border border-gray-100 rounded-xl p-7 hover:border-[#e8001d]/30 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#0d1b2a]/5 group-hover:bg-[#e8001d]/10 transition-colors">
                  <i className={`${p.icon} text-[#0d1b2a] group-hover:text-[#e8001d] text-xl transition-colors`} />
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tagColors[p.tag] || 'bg-gray-100 text-gray-500'}`}>
                  {p.tag}
                </span>
              </div>
              <h3 className="font-bold text-[#0d1b2a] text-base mb-3 leading-snug">{p.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{p.desc}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <div className="text-[#e8001d] font-bold text-sm">{p.result}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{p.duration}</div>
                </div>
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0d1b2a] group-hover:bg-[#e8001d] transition-colors">
                  <i className="ri-arrow-right-up-line text-white text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 flex justify-center">
          <a
            href="#contacts"
            onClick={(e) => {
              e.preventDefault();
              const el = document.querySelector('#contacts');
              if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#0d1b2a] text-white font-semibold rounded-md hover:bg-[#e8001d] transition-colors cursor-pointer whitespace-nowrap"
          >
            Обсудить ваш проект
            <i className="ri-arrow-right-line" />
          </a>
        </div>
      </div>
    </section>
  );
}
