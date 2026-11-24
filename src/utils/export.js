/** Utilidades de exportación CSV (con BOM UTF-8) y Excel (.xls). */

const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

const escapeHtml = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCSV(filename, headers, rows) {
  const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n')
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

/** Exportación compatible con Microsoft Excel (.xls basado en tabla HTML UTF-8). */
export function downloadExcel(filename, headers, rows, sheetName = 'PROSPEKTA') {
  const thead = `<tr>${headers.map((h) => `<th style="background:#021B54;color:#FFFFFF;font-weight:bold;padding:6px 10px;border:1px solid #CBD5E1">${escapeHtml(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map((r) => `<tr>${r.map((cell) => `<td style="padding:5px 10px;border:1px solid #E2E8F0;mso-number-format:'\\@'">${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(sheetName)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`
  triggerDownload(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename)
}

/** Plantilla de ejemplo para "Agregue empresas". */
export function downloadCompanyTemplate(lang = 'es') {
  const headers = lang === 'en' ? ['company', 'website', 'country'] : ['empresa', 'sitio_web', 'pais']
  downloadCSV(lang === 'en' ? 'prospekta_company_template.csv' : 'prospekta_plantilla_empresas.csv', headers, [
    ['Uniroca S.A.', 'uniroca.com', 'Colombia'],
    ['Clínica Las Américas Auna', 'lasamericas.com.co', 'Colombia'],
    ['Softtek México', 'https://www.softtek.com', 'México'],
    ['Grupo Logístico TCC', 'tcc.com.co', 'Colombia'],
  ])
}
