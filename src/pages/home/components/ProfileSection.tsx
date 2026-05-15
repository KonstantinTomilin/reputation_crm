export default function ProfileSection() {
  return (
    <section
      id="profile"
      className="relative min-h-screen bg-[#0d1b2a] flex items-center overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#112236] to-[#0a1520]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#e8001d]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#e8001d]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-0.5 bg-[#e8001d]" />
              <span className="text-[#e8001d] text-xs font-semibold uppercase tracking-widest">
                Репутация &amp; Маркетинг
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Защита репутации<br />
              <span className="text-[#e8001d]">в интернете</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
              Удаление негатива, управление поисковой выдачей и формирование положительного
              образа в сети. Работаю с бизнесом и частными лицами по всей России.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#contacts"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.querySelector('#contacts');
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                }}
                className="inline-flex items-center px-7 py-3.5 bg-[#e8001d] text-white font-semibold rounded-md hover:bg-[#c40019] transition-colors cursor-pointer whitespace-nowrap"
              >
                Обсудить проект
              </a>
              <a
                href="#projects"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.querySelector('#projects');
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-semibold rounded-md hover:border-white/40 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Мои проекты</span>
                <i className="ri-arrow-right-line" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-14 pt-10 border-t border-white/10">
              {[
                { value: '1500+', label: 'Клиентов' },
                { value: '15+', label: 'Лет опыта' },
                { value: '24/7', label: 'Поддержка' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-white/50 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — photo card */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="w-80 h-96 md:w-96 md:h-[480px] rounded-xl overflow-hidden">
                <img
                  src="https://public.readdy.ai/ai/img_res/59f558e9-f60d-4dd3-a113-04bc153dd286.png"
                  alt="Профиль"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              {/* Badge */}
              <div className="absolute -bottom-5 -left-5 bg-white rounded-xl px-6 py-4 shadow-xl">
                <div className="text-2xl font-bold text-[#0d1b2a]">Forbes</div>
                <div className="text-xs text-gray-500 mt-0.5">Упоминания в СМИ</div>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#e8001d] rounded-full flex items-center justify-center">
                <i className="ri-shield-check-line text-white text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Skills row */}
        <div className="mt-20 pt-10 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { icon: 'ri-search-line', title: 'SERM', desc: 'Управление репутацией в поиске' },
            { icon: 'ri-delete-bin-line', title: 'Удаление негатива', desc: 'Отзывы, статьи, упоминания' },
            { icon: 'ri-newspaper-line', title: 'PR в СМИ', desc: 'Публикации в ведущих изданиях' },
            { icon: 'ri-bar-chart-line', title: 'Аналитика', desc: 'Мониторинг репутации 24/7' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-3 group">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#e8001d]/10 group-hover:bg-[#e8001d]/20 transition-colors">
                <i className={`${item.icon} text-[#e8001d] text-lg`} />
              </div>
              <div className="text-white font-semibold text-sm">{item.title}</div>
              <div className="text-white/40 text-xs leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
