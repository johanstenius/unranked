/**
 * Base HTML wrapper for all email templates
 */
export function wrapEmail(content: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${content}
    <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Unranked - SEO Audit Tool
    </p>
  </div>
</body>
</html>
`.trim();
}

export function card(content: string): string {
	return `
<div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
  ${content}
</div>
`.trim();
}

export function heading(title: string, subtitle: string): string {
	return `
<h1 style="margin: 0 0 8px 0; font-size: 24px; color: #0f172a;">${title}</h1>
<p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px;">${subtitle}</p>
`.trim();
}

export function alertBox(
	message: string,
	type: "warning" | "error" | "info" = "info",
): string {
	const colors = {
		warning: { bg: "#fef3c7", text: "#92400e" },
		error: { bg: "#fee2e2", text: "#991b1b" },
		info: { bg: "#e0f2fe", text: "#0369a1" },
	};
	const { bg, text } = colors[type];

	return `
<div style="background: ${bg}; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin: 0; color: ${text}; font-size: 14px;">${message}</p>
</div>
`.trim();
}

export function paragraph(text: string): string {
	return `<p style="margin: 20px 0; color: #475569; font-size: 14px;">${text}</p>`;
}

export function button(text: string, url: string): string {
	return `
<a href="${url}" style="display: block; background: #0f172a; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 500; text-align: center; margin-top: 24px;">
  ${text}
</a>
`.trim();
}

export function footnote(text: string): string {
	return `<p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">${text}</p>`;
}
