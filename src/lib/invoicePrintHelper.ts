import { toJalaliDate, formatMoney, formatRial, formatNumber } from "@/lib/dateUtils";
import { numberToPersianWords } from "@/lib/numberToWords";

export interface PrintableInvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string | Date | null;
    customerName?: string | null;
    customerStore?: string | null;
    customerMobile?: string | null;
    customerAddress?: string | null;
    projectName?: string | null;
    employeeName?: string | null;
    subtotal: number | string;
    invoiceDiscount?: number | string;
    taxTotal?: number | string;
    grandTotal: number | string;
    paidAmount?: number | string;
    balanceDue?: number | string;
    notes?: string | null;
  };
  items: Array<{
    id?: string;
    productId?: string;
    productNameSnapshot: string;
    productCode?: string | null;
    productUnit?: string | null;
    quantity: number | string;
    unitPrice: number | string;
    discountAmount?: number | string;
    lineTotal: number | string;
  }>;
}

export function generateInvoiceHtml(data: PrintableInvoiceData): string {
  const { invoice, items } = data;
  const grandTotalNum = Number(invoice.grandTotal) || 0;
  const subtotalNum = Number(invoice.subtotal) || 0;
  const discountNum = Number(invoice.invoiceDiscount) || 0;
  const paidNum = Number(invoice.paidAmount) || 0;
  const balanceNum = Number(invoice.balanceDue) || 0;

  const itemsRows = items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="padding: 7px 6px; text-align: center; font-weight: bold; border-left: 1px solid #cbd5e1; color: #475569;">${idx + 1}</td>
      <td style="padding: 7px 8px; font-weight: bold; border-left: 1px solid #cbd5e1; color: #0f172a; text-align: right;">
        ${item.productNameSnapshot}
        ${item.productCode ? `<span style="font-size: 10px; color: #64748b; margin-right: 4px;">[${item.productCode}]</span>` : ""}
      </td>
      <td style="padding: 7px 6px; text-align: center; font-weight: bold; border-left: 1px solid #cbd5e1; color: #0f172a;">${formatNumber(item.quantity)}</td>
      <td style="padding: 7px 6px; text-align: center; border-left: 1px solid #cbd5e1; color: #475569;">${item.productUnit || "عدد"}</td>
      <td style="padding: 7px 8px; text-align: left; border-left: 1px solid #cbd5e1; color: #0f172a;">${formatMoney(item.unitPrice, "")}</td>
      <td style="padding: 7px 8px; text-align: left; border-left: 1px solid #cbd5e1; color: #0f172a;">${formatMoney(item.discountAmount || 0, "")}</td>
      <td style="padding: 7px 8px; text-align: left; font-weight: bold; color: #0f172a;">${formatMoney(item.lineTotal, "")}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاکتور فروش شماره ${invoice.invoiceNumber || "رسمی"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Vazirmatn, sans-serif;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-size: 11px;
      line-height: 1.5;
      padding: 10px;
    }
    .invoice-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      border: 2px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      background: #ffffff;
    }
    .header-box {
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .org-title {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .org-sub {
      font-size: 11px;
      color: #475569;
    }
    .meta-box {
      border: 1px solid #94a3b8;
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 8px 14px;
      text-align: center;
      min-width: 170px;
      font-size: 11px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .info-card {
      border: 1px solid #94a3b8;
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
    }
    .card-title {
      font-weight: 800;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .table-container {
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead {
      background-color: #e2e8f0;
      color: #1e293b;
      font-weight: bold;
      border-bottom: 1px solid #1e293b;
    }
    thead th {
      padding: 8px 6px;
      text-align: right;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .words-box {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 11px;
    }
    .calcs-box {
      border: 1px solid #1e293b;
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .calc-row.highlight {
      border-top: 1px solid #94a3b8;
      padding-top: 5px;
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      border-top: 2px solid #1e293b;
      padding-top: 16px;
      text-align: center;
      margin-top: 10px;
    }
    .sign-line {
      height: 45px;
      border-bottom: 1px dashed #94a3b8;
      margin: 8px 25px 0 25px;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .invoice-container {
        border: 2px solid #000000;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header-box">
      <div>
        <div class="org-title">سازمان و صنایع بازرگانی حکمت آکما</div>
        <div class="org-sub">صورتحساب فروش کالا و خدمات (فاکتور رسمی تجاری)</div>
      </div>
      <div class="meta-box">
        <div><span style="color: #64748b;">شماره فاکتور: </span><strong style="color: #0f172a;">${invoice.invoiceNumber || "—"}</strong></div>
        <div style="margin-top: 3px;"><span style="color: #64748b;">تاریخ صدور: </span><strong style="color: #0f172a;">${toJalaliDate(invoice.invoiceDate)}</strong></div>
        ${invoice.projectName ? `<div style="margin-top: 3px;"><span style="color: #64748b;">پروژه: </span><strong style="color: #7e22ce;">${invoice.projectName}</strong></div>` : ""}
      </div>
    </div>

    <!-- Seller & Buyer -->
    <div class="grid-2">
      <div class="info-card">
        <div class="card-title">مشخصات فروشنده</div>
        <div><span style="color: #64748b;">نام شرکت: </span><strong>شرکت حکمت آکما</strong></div>
        <div><span style="color: #64748b;">کد اقتصادی: </span>۴۱۱۵۸۹۳۲۴۷۸۵ | <span style="color: #64748b;">شناسه ملی: </span>۱۰۳۸۰۴۵۹۶۱۰</div>
        <div><span style="color: #64748b;">نشانی و تلفن: </span>دفتر مرکزی - تلفن: ۰۲۱-۸۸۹۹۰۰۱۱</div>
      </div>
      <div class="info-card">
        <div class="card-title">مشخصات خریدار</div>
        <div><span style="color: #64748b;">نام خریدار / فروشگاه: </span><strong>${invoice.customerName || "—"} ${invoice.customerStore ? `(${invoice.customerStore})` : ""}</strong></div>
        <div><span style="color: #64748b;">شماره تماس: </span>${invoice.customerMobile || "—"}</div>
        <div><span style="color: #64748b;">نشانی: </span>${invoice.customerAddress || "تهران - ارسال حضوری"}</div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center; border-left: 1px solid #94a3b8;">ردیف</th>
            <th style="border-left: 1px solid #94a3b8;">شرح کالا یا خدمات</th>
            <th style="width: 55px; text-align: center; border-left: 1px solid #94a3b8;">تعداد</th>
            <th style="width: 50px; text-align: center; border-left: 1px solid #94a3b8;">واحد</th>
            <th style="width: 100px; text-align: left; border-left: 1px solid #94a3b8;">مبلغ واحد (تومان)</th>
            <th style="width: 90px; text-align: left; border-left: 1px solid #94a3b8;">تخفیف (تومان)</th>
            <th style="width: 110px; text-align: left;">مبلغ کل (تومان)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div class="summary-grid">
      <div class="words-box">
        <div>
          <div style="color: #64748b; font-weight: bold; margin-bottom: 4px;">مبلغ کل قابل پرداخت به حروف:</div>
          <div style="font-weight: bold; color: #0f172a; font-size: 12px; line-height: 1.6;">${numberToPersianWords(grandTotalNum, "تومان")}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">معادل: ${formatRial(grandTotalNum)}</div>
        </div>
        ${invoice.employeeName ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #475569;">ویزیتور / نماینده فروش: <strong>${invoice.employeeName}</strong></div>` : ""}
      </div>

      <div class="calcs-box">
        <div class="calc-row">
          <span style="color: #475569;">جمع اقلام فاکتور:</span>
          <strong>${formatMoney(subtotalNum)}</strong>
        </div>
        ${
          discountNum > 0
            ? `<div class="calc-row" style="color: #e11d48;">
          <span>تخفیف کلی فاکتور:</span>
          <span>${formatMoney(discountNum)}</span>
        </div>`
            : ""
        }
        <div class="calc-row highlight">
          <span>مبلغ نهایی فاکتور:</span>
          <span style="color: #6b21a8;">${formatMoney(grandTotalNum)}</span>
        </div>
        <div class="calc-row" style="color: #047857; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px;">
          <span>مبلغ پرداخت شده:</span>
          <span>${formatMoney(paidNum)}</span>
        </div>
        <div class="calc-row" style="color: #be123c; font-weight: bold;">
          <span>مانده بدهی (طلب):</span>
          <span>${formatMoney(balanceNum)}</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures-grid">
      <div>
        <strong style="color: #334155;">مهر و امضای فروشنده (شرکت حکمت آکما)</strong>
        <div class="sign-line"></div>
      </div>
      <div>
        <strong style="color: #334155;">مهر و امضای خریدار / تحویل‌گیرنده</strong>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Clean & reliable printing method that works in any browser and never prints blank pages.
 */
export function triggerInvoicePrint(data: PrintableInvoiceData): void {
  const html = generateInvoiceHtml(data);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    alert("امکان باز کردن پنجره چاپ وجود ندارد.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2500);
  }, 400);
}

/**
 * Downloads high quality JPG invoice safely without CSS oklch or clipping issues
 */
export async function downloadInvoiceJpg(data: PrintableInvoiceData, element?: HTMLElement | null): Promise<void> {
  const invoiceNumber = data.invoice.invoiceNumber || "Factor";
  const filename = `Factor-${invoiceNumber}.jpg`;

  try {
    const html2canvasModule = await import("html2canvas");
    const html2canvas = html2canvasModule.default || html2canvasModule;

    // Create an isolated container outside viewport to render without modern CSS interference
    const tempWrapper = document.createElement("div");
    tempWrapper.style.position = "fixed";
    tempWrapper.style.left = "-9999px";
    tempWrapper.style.top = "0";
    tempWrapper.style.width = "850px";
    tempWrapper.style.backgroundColor = "#ffffff";
    tempWrapper.style.zIndex = "-1000";
    tempWrapper.style.padding = "20px";
    tempWrapper.innerHTML = generateInvoiceHtml(data);

    document.body.appendChild(tempWrapper);

    const invoiceBox = tempWrapper.querySelector(".invoice-container") as HTMLElement || tempWrapper;

    const canvas = await html2canvas(invoiceBox, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 1000,
    });

    document.body.removeChild(tempWrapper);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = imgData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err: any) {
    console.error("Invoice JPG capture error:", err);
    // Fallback: If html2canvas fails on element, try direct fallback
    alert("خطا در ایجاد تصویر فاکتور: " + (err?.message || "لطفاً از دکمه چاپ و ذخیره PDF استفاده کنید."));
  }
}

