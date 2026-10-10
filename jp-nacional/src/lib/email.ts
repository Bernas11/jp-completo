import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || "noreply@juventudepopular.pt";
const CPN = process.env.EMAIL_CPN || "sedenacional@juventudepopular.org";

export async function enviarEmailAdesaoMilitante(opts: {
  nome: string;
  email: string;
  concelho: string;
}) {
  await transporter.sendMail({
    from: `"Juventude Popular" <${FROM}>`,
    to: opts.email,
    subject: "Recebemos a tua ficha de adesão — Juventude Popular",
    html: `
<!DOCTYPE html>
<html lang="pt">
<body style="font-family:Arial,sans-serif;background:#f7f8fb;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(25,43,160,.08)">
  <div style="background:#192BA0;padding:32px 40px;text-align:center">
    <h1 style="color:#FDE021;font-size:26px;margin:0;font-weight:900;font-style:italic;text-transform:uppercase">Juventude Popular</h1>
  </div>
  <div style="padding:36px 40px">
    <h2 style="color:#0e1d6b;margin:0 0 12px">Olá, ${opts.nome.split(" ")[0]}!</h2>
    <p style="color:#4a5591;line-height:1.6">Recebemos a tua ficha de adesão para a concelhia de <strong>${opts.concelho}</strong>.</p>
    <p style="color:#4a5591;line-height:1.6">A Comissão Política Nacional irá analisar o teu pedido e responder-te em até <strong>uma semana útil</strong>.</p>
    <div style="background:#e7ebfa;border-radius:8px;padding:20px;margin:24px 0">
      <p style="margin:0;color:#0e1d6b;font-size:15px;font-style:italic">"Do Dizer ao Fazer. Por Portugal!" — Catarina Marinho, Presidente da JP</p>
    </div>
    <p style="color:#4a5591;font-size:13px">Em caso de dúvida, contacta-nos em <a href="mailto:sedenacional@juventudepopular.org" style="color:#192BA0">sedenacional@juventudepopular.org</a>.</p>
  </div>
  <div style="background:#0e1d6b;padding:16px 40px;text-align:center">
    <p style="color:#fff;opacity:.6;font-size:12px;margin:0">© ${new Date().getFullYear()} Juventude Popular · juventudepopular.pt</p>
  </div>
</div>
</body>
</html>`,
  });
}

export async function enviarEmailAdesaoCPN(opts: {
  nome: string;
  email: string;
  telemovel: string;
  concelho: string;
  distrito: string;
  militanteId: string;
}) {
  await transporter.sendMail({
    from: `"Sistema JP" <${FROM}>`,
    to: CPN,
    subject: `[ADESÃO] Nova ficha de militância — ${opts.nome} (${opts.concelho})`,
    html: `
<!DOCTYPE html>
<html lang="pt">
<body style="font-family:Arial,sans-serif;background:#f7f8fb;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#192BA0;padding:24px 32px">
    <h1 style="color:#FDE021;font-size:20px;margin:0;font-weight:900">Nova ficha de adesão</h1>
  </div>
  <div style="padding:32px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#4a5591;width:140px">ID</td><td style="padding:8px 0;color:#0e1d6b;font-weight:600">${opts.militanteId}</td></tr>
      <tr style="background:#f7f8fb"><td style="padding:8px;color:#4a5591">Nome</td><td style="padding:8px;color:#0e1d6b;font-weight:600">${opts.nome}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5591">Email</td><td style="padding:8px 0;color:#0e1d6b">${opts.email}</td></tr>
      <tr style="background:#f7f8fb"><td style="padding:8px;color:#4a5591">Telemóvel</td><td style="padding:8px;color:#0e1d6b">${opts.telemovel}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5591">Concelho</td><td style="padding:8px 0;color:#0e1d6b">${opts.concelho}</td></tr>
      <tr style="background:#f7f8fb"><td style="padding:8px;color:#4a5591">Distrito</td><td style="padding:8px;color:#0e1d6b">${opts.distrito}</td></tr>
    </table>
    <div style="margin-top:24px;padding:16px;background:#e7ebfa;border-radius:8px">
      <p style="margin:0;font-size:13px;color:#0e1d6b">O documento de identificação está disponível no painel CPN em <strong>admin.juventudepopular.pt</strong>.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  });
}

export async function enviarEmailEncomenda(opts: {
  nome: string;
  email: string;
  items: { nome: string; quantidade: number; preco: string }[];
  total: string;
  encomendaId: string;
}) {
  const linhas = opts.items
    .map((i) => `<tr><td style="padding:8px 0;color:#0e1d6b">${i.nome}</td><td style="padding:8px 0;color:#4a5591;text-align:center">${i.quantidade}</td><td style="padding:8px 0;color:#0e1d6b;text-align:right">${i.preco}</td></tr>`)
    .join("");

  await transporter.sendMail({
    from: `"Marca JP" <${FROM}>`,
    to: opts.email,
    subject: `Encomenda #${opts.encomendaId} confirmada — Marca JP`,
    html: `
<!DOCTYPE html>
<html lang="pt">
<body style="font-family:Arial,sans-serif;background:#f7f8fb;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#192BA0;padding:32px 40px;text-align:center">
    <h1 style="color:#FDE021;font-size:22px;margin:0;font-weight:900;font-style:italic;text-transform:uppercase">Marca JP</h1>
  </div>
  <div style="padding:36px 40px">
    <h2 style="color:#0e1d6b">Obrigado, ${opts.nome.split(" ")[0]}!</h2>
    <p style="color:#4a5591">A tua encomenda foi confirmada.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <thead><tr style="border-bottom:2px solid #e7ebfa"><th style="text-align:left;padding:8px 0;color:#0e1d6b;font-size:13px">Produto</th><th style="color:#0e1d6b;font-size:13px">Qtd</th><th style="text-align:right;color:#0e1d6b;font-size:13px">Preço</th></tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr style="border-top:2px solid #e7ebfa"><td colspan="2" style="padding:12px 0;font-weight:700;color:#0e1d6b">Total</td><td style="text-align:right;font-weight:700;color:#192BA0">${opts.total}</td></tr></tfoot>
    </table>
    <p style="color:#4a5591;font-size:13px">Entraremos em contacto para confirmar a entrega. Dúvidas: <a href="mailto:sedenacional@juventudepopular.org" style="color:#192BA0">sedenacional@juventudepopular.org</a></p>
  </div>
</div>
</body>
</html>`,
  });
}
