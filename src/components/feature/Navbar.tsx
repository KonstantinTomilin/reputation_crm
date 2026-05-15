import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const navLinks = [
  { label: 'Профиль', href: '#profile' },
  { label: 'Проекты', href: '#projects' },
  { label: 'Кейсы', href: '#cases' },
  { label: 'Вопросы', href: '#faq' },
  { label: 'Контакты', href: '#contacts' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0d1b2a] shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-20">
        {/* Logo */}
        <a href="#profile" onClick={(e) => handleNavClick(e, '#profile')} className="flex items-center cursor-pointer">
          <img
            src="https://public.readdy.ai/ai/img_res/59f558e9-f60d-4dd3-a113-04bc153dd286.png"
            alt="Логотип"
            className="h-10 w-auto object-contain"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-medium text-white/70 hover:text-[#e8001d] transition-colors duration-200 whitespace-nowrap tracking-wide uppercase"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* CRM Login button */}
          <button
            onClick={() => navigate('/crm-login')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap border border-white/20 rounded-md hover:border-white/40 hover:bg-white/5"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-login-box-line text-base" />
            </div>
            <span>Вход в CRM</span>
          </button>

          <div className="w-px h-5 bg-white/20" />

          {/* CTA */}
          <a
            href="#contacts"
            onClick={(e) => handleNavClick(e, '#contacts')}
            className="inline-flex items-center px-5 py-2.5 bg-[#e8001d] text-white text-sm font-semibold rounded-md hover:bg-[#c40019] transition-colors whitespace-nowrap cursor-pointer"
          >
            Связаться
          </a>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-white cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          <i className={`text-xl ${menuOpen ? 'ri-close-line' : 'ri-menu-line'}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d1b2a] border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-medium text-white/70 hover:text-[#e8001d] transition-colors uppercase tracking-wide cursor-pointer"
            >
              {link.label}
            </a>
          ))}

          <div className="border-t border-white/10 pt-4 mt-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/crm-login');
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left w-full"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-login-box-line text-base" />
              </div>
              Вход в CRM
            </button>
          </div>

          <a
            href="#contacts"
            onClick={(e) => handleNavClick(e, '#contacts')}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#e8001d] text-white text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap"
          >
            Связаться
          </a>
        </div>
      )}
    </header>
  );
}
