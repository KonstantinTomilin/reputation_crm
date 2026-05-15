import Navbar from '@/components/feature/Navbar';
import ProfileSection from './components/ProfileSection';
import ProjectsSection from './components/ProjectsSection';
import CasesSection from './components/CasesSection';
import FaqSection from './components/FaqSection';
import ContactsSection from './components/ContactsSection';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <ProfileSection />
      <ProjectsSection />
      <CasesSection />
      <FaqSection />
      <ContactsSection />

      {/* Footer */}
      <footer className="bg-[#0a1520] py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src="https://public.readdy.ai/ai/img_res/59f558e9-f60d-4dd3-a113-04bc153dd286.png"
            alt="Логотип"
            className="h-8 w-auto object-contain"
          />
          <div className="text-white/30 text-xs text-center">
            © {new Date().getFullYear()} Все права защищены
          </div>
          <div className="flex items-center gap-5">
            {[
              { icon: 'ri-telegram-line', href: 'https://t.me/username' },
              { icon: 'ri-whatsapp-line', href: '#' },
              { icon: 'ri-instagram-line', href: '#' },
            ].map((s) => (
              <a
                key={s.icon}
                href={s.href}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-[#e8001d] transition-colors cursor-pointer"
              >
                <i className={`${s.icon} text-base`} />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
