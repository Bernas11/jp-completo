import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LogIn, ShieldCheck } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "./icons/SocialIcons";
import Newsletter from "./Newsletter";
import { SHOP_ENABLED } from "@/lib/features";

const SOCIALS = [
  { icon: FacebookIcon, href: "https://www.facebook.com/JuventudePopular/", label: "Facebook" },
  { icon: InstagramIcon, href: "https://www.instagram.com/juventudepopular/", label: "Instagram" },
  { icon: YoutubeIcon, href: "https://www.youtube.com/channel/UCaihXLLzR6y2_F2xo_JQQQA", label: "YouTube" },
];

const LIGACOES = [
  { label: "CDS-PP", href: "https://www.cds.pt/" },
  { label: "YEPP", href: "https://youthepp.eu/" },
  { label: "FTDC", href: "https://www.ftdc.net/" },
];

export default async function SiteFooter() {
  const t = await getTranslations();

  return (
    <footer id="contactos" className="bg-jp-blue-deep text-white/70 py-16 border-t-4 border-jp-yellow">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-5 gap-10 mb-10">
          <div className="md:col-span-2">
            <Image src="/brand/logo-full-transparent.png" alt="Juventude Popular" width={281} height={158} className="h-12 w-auto mb-4" />
            <p className="text-sm max-w-[32ch] mb-5">{t("footer.sede")}</p>
            <div className="flex gap-2">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Juventude Popular no ${s.label}`}
                    className="w-9 h-9 rounded-full bg-white/8 border border-white/15 flex items-center justify-center hover:bg-jp-yellow hover:text-jp-blue-deep hover:border-jp-yellow transition-colors"
                  >
                    <Icon width={16} height={16} />
                  </a>
                );
              })}
            </div>
          </div>
          <nav aria-label="JP">
            <h3 className="font-display text-xs text-jp-yellow mb-4">{t("footer.jp_heading")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/historia" className="hover:text-white">{t("footer.historia")}</Link></li>
              <li><Link href="/#pilares" className="hover:text-white">{t("footer.pilares")}</Link></li>
              <li><Link href="/anteriores-lideres" className="hover:text-white">Anteriores Líderes</Link></li>
              <li><Link href="/goncalo-begonha" className="hover:text-white">Gonçalo Begonha</Link></li>
              {SHOP_ENABLED && <li><Link href="/marca-jp" className="hover:text-white">Marca JP</Link></li>}
              <li><Link href="/orgaos-nacionais" className="hover:text-white">{t("footer.orgaos")}</Link></li>
              <li><Link href="/documentacao" className="hover:text-white">{t("nav.documentacao")}</Link></li>
            </ul>
          </nav>
          <nav aria-label="Participar">
            <h3 className="font-display text-xs text-jp-yellow mb-4">{t("footer.participar_heading")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/aderir" className="hover:text-white">{t("footer.aderir")}</Link></li>
              <li><Link href="/#atividades" className="hover:text-white">{t("footer.atividades")}</Link></li>
              <li><Link href="/carta-de-principios" className="hover:text-white">{t("footer.carta")}</Link></li>
            </ul>
          </nav>
          <nav aria-label="Ligações">
            <h3 className="font-display text-xs text-jp-yellow mb-4">Ligações</h3>
            <ul className="space-y-2 text-sm mb-6">
              {LIGACOES.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">{l.label}</a>
                </li>
              ))}
              <li><Link href="/contactos" className="hover:text-white">Contactos</Link></li>
            </ul>
            <h3 className="font-display text-xs text-jp-yellow mb-3">Newsletter</h3>
            <Newsletter />
          </nav>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="text-xs">© {new Date().getFullYear()} {t("footer.rights")}</p>
          <div className="flex gap-2.5">
            <a
              href="https://portal.juventudepopular.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/8 border border-white/15 text-xs font-display hover:bg-jp-yellow hover:text-jp-blue-deep hover:border-jp-yellow transition-colors"
            >
              <LogIn size={13} /> {t("footer.portal_label")}
            </a>
            <a
              href="https://admin.juventudepopular.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/8 border border-white/15 text-xs font-display hover:bg-jp-yellow hover:text-jp-blue-deep hover:border-jp-yellow transition-colors"
            >
              <ShieldCheck size={13} /> {t("footer.admin_label")}
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          <Link href="/politica-privacidade" className="hover:text-white">Política de Privacidade</Link>
          <Link href="/politica-cookies" className="hover:text-white">Política de Cookies</Link>
          <Link href="/termos-condicoes" className="hover:text-white">Termos e Condições</Link>
        </div>
      </div>
    </footer>
  );
}
