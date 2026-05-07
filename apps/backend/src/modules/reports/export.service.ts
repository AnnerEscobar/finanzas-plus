import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  private readonly MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  private formatQ(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  private getDebtTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      loan: 'Préstamo',
      advance: 'Adelanto',
      cooperative: 'Cooperativa',
      personal: 'Personal',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  private getMovementTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      income: 'Ingreso',
      expense: 'Gasto',
      transfer: 'Transferencia',
      adjustment: 'Ajuste',
    };
    return labels[type] || type;
  }

  /**
   * Generar reporte mensual en Excel
   */
  async generateExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Finanzas+';
    workbook.created = new Date();

    const periodLabel = `${this.MONTH_NAMES[data.period.month - 1]} ${data.period.year}`;

    // ============================================
    // Sheet 1: Resumen
    // ============================================
    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.properties.defaultColWidth = 25;

    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = `Reporte Financiero - ${periodLabel}`;
    summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF1E40AF' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    summarySheet.getRow(1).height = 30;

    summarySheet.getCell('A2').value = `Generado: ${new Date(data.generatedAt).toLocaleString('es-GT')}`;
    summarySheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } };

    // Patrimonio
    summarySheet.addRow([]);
    summarySheet.addRow(['MÉTRICAS PRINCIPALES']);
    summarySheet.lastRow!.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    summarySheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    const metrics: Array<[string, number, string]> = [
      ['Activos (Cuentas)', data.summary.totalAssetsCents, 'FF10B981'],
      ['Fondos', data.summary.totalFundsCents, 'FF3B82F6'],
      ['Tarjetas de Crédito', data.summary.totalCardDebtCents, 'FFF59E0B'],
      ['Deudas (Préstamos)', data.summary.totalDebtCents, 'FFEF4444'],
      ['Patrimonio Neto', data.summary.netWorthCents, 'FF7C3AED'],
    ];
    metrics.forEach(([label, cents, color]) => {
      const row = summarySheet.addRow([label, this.formatQ(cents)]);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { color: { argb: color }, bold: true };
    });

    // Movimientos del mes
    summarySheet.addRow([]);
    summarySheet.addRow(['MOVIMIENTOS DEL MES']);
    summarySheet.lastRow!.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    summarySheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    summarySheet.addRow(['Total Ingresos', data.summary.totalIncomeFormatted]);
    summarySheet.lastRow!.getCell(2).font = { color: { argb: 'FF10B981' }, bold: true };
    summarySheet.addRow(['Total Gastos', data.summary.totalExpenseFormatted]);
    summarySheet.lastRow!.getCell(2).font = { color: { argb: 'FFEF4444' }, bold: true };
    summarySheet.addRow(['Balance', data.summary.balanceFormatted]);
    summarySheet.lastRow!.font = { bold: true };
    summarySheet.addRow(['Cantidad de movimientos', data.summary.movementsCount]);

    // Gastos por categoría
    if (data.summary.expenseByCategory && data.summary.expenseByCategory.length > 0) {
      summarySheet.addRow([]);
      summarySheet.addRow(['GASTOS POR CATEGORÍA']);
      summarySheet.lastRow!.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      summarySheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

      data.summary.expenseByCategory.forEach((cat: any) => {
        summarySheet.addRow([cat.name, this.formatQ(cat.totalCents)]);
      });
    }

    // ============================================
    // Sheet 2: Cuentas
    // ============================================
    const accountsSheet = workbook.addWorksheet('Cuentas');
    accountsSheet.columns = [
      { header: 'Alias', key: 'alias', width: 25 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Institución', key: 'institution', width: 25 },
      { header: 'Saldo', key: 'balance', width: 18 },
    ];
    accountsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    accountsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    data.accounts.forEach((acc: any) => {
      accountsSheet.addRow({
        alias: acc.alias,
        type: acc.type,
        institution: acc.institution,
        balance: this.formatQ(acc.currentBalanceCents),
      });
    });

    // ============================================
    // Sheet 3: Tarjetas
    // ============================================
    const cardsSheet = workbook.addWorksheet('Tarjetas');
    cardsSheet.columns = [
      { header: 'Alias', key: 'alias', width: 25 },
      { header: 'Emisor', key: 'issuer', width: 18 },
      { header: 'Límite', key: 'limit', width: 18 },
      { header: 'Saldo', key: 'balance', width: 18 },
      { header: 'Disponible', key: 'available', width: 18 },
    ];
    cardsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cardsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    data.creditCards.forEach((c: any) => {
      cardsSheet.addRow({
        alias: c.alias,
        issuer: c.issuer,
        limit: this.formatQ(c.creditLimitCents),
        balance: this.formatQ(c.totalBalanceCents),
        available: this.formatQ(c.availableCreditCents),
      });
    });

    // ============================================
    // Sheet 4: Deudas
    // ============================================
    const debtsSheet = workbook.addWorksheet('Deudas');
    debtsSheet.columns = [
      { header: 'Alias', key: 'alias', width: 25 },
      { header: 'Acreedor', key: 'creditor', width: 25 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Monto Original', key: 'original', width: 18 },
      { header: 'Saldo Restante', key: 'remaining', width: 18 },
      { header: 'Cuota Mensual', key: 'monthly', width: 18 },
      { header: 'Cuotas', key: 'installments', width: 12 },
    ];
    debtsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    debtsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    data.debts.forEach((d: any) => {
      debtsSheet.addRow({
        alias: d.alias,
        creditor: d.creditorName,
        type: this.getDebtTypeLabel(d.debtType),
        original: this.formatQ(d.originalAmountCents),
        remaining: this.formatQ(d.remainingCents),
        monthly: this.formatQ(d.monthlyPaymentCents),
        installments: d.totalInstallments > 0
          ? `${d.paidInstallments}/${d.totalInstallments}`
          : '-',
      });
    });

    // ============================================
    // Sheet 5: Fondos
    // ============================================
    const fundsSheet = workbook.addWorksheet('Fondos');
    fundsSheet.columns = [
      { header: 'Alias', key: 'alias', width: 25 },
      { header: 'Institución', key: 'institution', width: 20 },
      { header: 'Acumulado', key: 'current', width: 18 },
      { header: 'Meta', key: 'target', width: 18 },
      { header: 'Aporte/mes', key: 'monthly', width: 18 },
    ];
    fundsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fundsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    data.funds.forEach((f: any) => {
      fundsSheet.addRow({
        alias: f.alias,
        institution: f.institution,
        current: this.formatQ(f.currentAmountCents),
        target: this.formatQ(f.targetAmountCents),
        monthly: this.formatQ(f.monthlyContributionCents),
      });
    });

    // ============================================
    // Sheet 6: Movimientos
    // ============================================
    const movementsSheet = workbook.addWorksheet('Movimientos');
    movementsSheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Cuenta', key: 'account', width: 20 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Forma de Pago', key: 'method', width: 14 },
      { header: 'Monto', key: 'amount', width: 14 },
      { header: 'Descripción', key: 'note', width: 30 },
    ];
    movementsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    movementsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    data.movements.forEach((m: any) => {
      const row = movementsSheet.addRow({
        date: new Date(m.date).toLocaleDateString('es-GT'),
        type: this.getMovementTypeLabel(m.type),
        account: m.accountAlias,
        category: m.categoryName,
        method: m.paymentMethod,
        amount: this.formatQ(m.amountCents),
        note: m.note,
      });

      // Color del monto según tipo
      const amountCell = row.getCell(6);
      if (m.type === 'income') {
        amountCell.font = { color: { argb: 'FF10B981' }, bold: true };
      } else if (m.type === 'expense') {
        amountCell.font = { color: { argb: 'FFEF4444' }, bold: true };
      } else if (m.type === 'transfer') {
        amountCell.font = { color: { argb: 'FF3B82F6' } };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generar reporte mensual en PDF
   */
  async generatePdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new (PDFDocument as any)({ size: 'LETTER', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const periodLabel = `${this.MONTH_NAMES[data.period.month - 1]} ${data.period.year}`;

        // Header
        doc.fontSize(22).fillColor('#1E40AF').text('Finanzas+', { align: 'center' });
        doc.fontSize(14).fillColor('#374151').text(`Reporte Financiero - ${periodLabel}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#6B7280').text(
          `Generado: ${new Date(data.generatedAt).toLocaleString('es-GT')}`,
          { align: 'center' },
        );
        doc.moveDown(1);

        // Línea separadora
        doc.moveTo(40, doc.y).lineTo(572, doc.y).strokeColor('#E5E7EB').stroke();
        doc.moveDown(0.5);

        // Métricas Principales
        doc.fontSize(14).fillColor('#1E40AF').text('Métricas Principales', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#000');

        const metrics: Array<[string, string, string]> = [
          ['Activos (Cuentas):', this.formatQ(data.summary.totalAssetsCents), '#10B981'],
          ['Fondos:', this.formatQ(data.summary.totalFundsCents), '#3B82F6'],
          ['Tarjetas de Crédito:', this.formatQ(data.summary.totalCardDebtCents), '#F59E0B'],
          ['Deudas (Préstamos):', this.formatQ(data.summary.totalDebtCents), '#EF4444'],
          ['Patrimonio Neto:', this.formatQ(data.summary.netWorthCents), '#7C3AED'],
        ];

        metrics.forEach(([label, value, color]) => {
          doc.fillColor('#374151').text(label, { continued: true, width: 250 });
          doc.fillColor(color).text(value, { align: 'right' });
        });

        doc.moveDown(1);

        // Movimientos del mes
        doc.fontSize(14).fillColor('#1E40AF').text('Movimientos del Mes', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#000');
        doc.fillColor('#374151').text('Total Ingresos:', { continued: true, width: 250 });
        doc.fillColor('#10B981').text(data.summary.totalIncomeFormatted, { align: 'right' });
        doc.fillColor('#374151').text('Total Gastos:', { continued: true, width: 250 });
        doc.fillColor('#EF4444').text(data.summary.totalExpenseFormatted, { align: 'right' });
        doc.fillColor('#374151').text('Balance del mes:', { continued: true, width: 250 });
        doc.fillColor(data.summary.balance >= 0 ? '#10B981' : '#EF4444')
           .text(data.summary.balanceFormatted, { align: 'right' });
        doc.fillColor('#374151').text(`Movimientos: ${data.summary.movementsCount}`);
        doc.moveDown(1);

        // Gastos por categoría
        if (data.summary.expenseByCategory && data.summary.expenseByCategory.length > 0) {
          doc.fontSize(14).fillColor('#1E40AF').text('Gastos por Categoría', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000');
          data.summary.expenseByCategory.forEach((cat: any) => {
            doc.fillColor('#374151').text(`• ${cat.name}:`, { continued: true, width: 250 });
            doc.fillColor('#EF4444').text(this.formatQ(cat.totalCents), { align: 'right' });
          });
          doc.moveDown(1);
        }

        // Cuentas
        if (data.accounts && data.accounts.length > 0) {
          doc.addPage();
          doc.fontSize(14).fillColor('#1E40AF').text('Cuentas', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000');
          data.accounts.forEach((acc: any) => {
            doc.fillColor('#374151').text(`${acc.alias} (${acc.institution || acc.type}):`, {
              continued: true, width: 350,
            });
            doc.fillColor('#10B981').text(this.formatQ(acc.currentBalanceCents), { align: 'right' });
          });
          doc.moveDown(1);
        }

        // Tarjetas
        if (data.creditCards && data.creditCards.length > 0) {
          doc.fontSize(14).fillColor('#1E40AF').text('Tarjetas de Crédito', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000');
          data.creditCards.forEach((c: any) => {
            doc.fillColor('#374151').text(`${c.alias} (${c.issuer}):`, {
              continued: true, width: 350,
            });
            doc.fillColor('#F59E0B').text(
              `${this.formatQ(c.totalBalanceCents)} / ${this.formatQ(c.creditLimitCents)}`,
              { align: 'right' },
            );
          });
          doc.moveDown(1);
        }

        // Deudas
        if (data.debts && data.debts.length > 0) {
          doc.fontSize(14).fillColor('#1E40AF').text('Deudas', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000');
          data.debts.forEach((d: any) => {
            doc.fillColor('#374151').text(
              `${d.alias} (${d.creditorName}) - ${this.getDebtTypeLabel(d.debtType)}:`,
              { continued: true, width: 350 },
            );
            doc.fillColor('#EF4444').text(this.formatQ(d.remainingCents), { align: 'right' });
            if (d.totalInstallments > 0) {
              doc.fontSize(8).fillColor('#6B7280').text(
                `   Cuota ${d.paidInstallments}/${d.totalInstallments} - ${this.formatQ(d.monthlyPaymentCents)}/mes`,
              );
              doc.fontSize(10).fillColor('#000');
            }
          });
          doc.moveDown(1);
        }

        // Fondos
        if (data.funds && data.funds.length > 0) {
          doc.fontSize(14).fillColor('#1E40AF').text('Fondos', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000');
          data.funds.forEach((f: any) => {
            doc.fillColor('#374151').text(`${f.alias} (${f.institution || ''}):`, {
              continued: true, width: 350,
            });
            doc.fillColor('#3B82F6').text(this.formatQ(f.currentAmountCents), { align: 'right' });
          });
          doc.moveDown(1);
        }

        // Movimientos detallados
        if (data.movements && data.movements.length > 0) {
          doc.addPage();
          doc.fontSize(14).fillColor('#1E40AF').text('Movimientos del Mes', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(8).fillColor('#000');

          // Encabezado de tabla
          const startY = doc.y;
          doc.fillColor('#1E40AF').rect(40, startY, 532, 20).fill();
          doc.fillColor('#FFFFFF');
          doc.text('Fecha', 45, startY + 5, { width: 60 });
          doc.text('Tipo', 105, startY + 5, { width: 60 });
          doc.text('Cuenta', 165, startY + 5, { width: 90 });
          doc.text('Categoría', 255, startY + 5, { width: 90 });
          doc.text('Descripción', 345, startY + 5, { width: 130 });
          doc.text('Monto', 475, startY + 5, { width: 90, align: 'right' });

          doc.fillColor('#000').y = startY + 25;

          data.movements.slice(0, 50).forEach((m: any, idx: number) => {
            if (doc.y > 720) {
              doc.addPage();
            }

            const rowY = doc.y;
            if (idx % 2 === 0) {
              doc.fillColor('#F9FAFB').rect(40, rowY - 2, 532, 16).fill();
            }

            doc.fillColor('#000').fontSize(8);
            doc.text(new Date(m.date).toLocaleDateString('es-GT'), 45, rowY, { width: 60 });
            doc.text(this.getMovementTypeLabel(m.type), 105, rowY, { width: 60 });
            doc.text(m.accountAlias.substring(0, 18), 165, rowY, { width: 90 });
            doc.text(m.categoryName.substring(0, 18), 255, rowY, { width: 90 });
            doc.text((m.note || '').substring(0, 28), 345, rowY, { width: 130 });

            const color = m.type === 'income' ? '#10B981' : m.type === 'expense' ? '#EF4444' : '#3B82F6';
            doc.fillColor(color).text(this.formatQ(m.amountCents), 475, rowY, { width: 90, align: 'right' });

            doc.y = rowY + 14;
          });

          if (data.movements.length > 50) {
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#6B7280').text(
              `... y ${data.movements.length - 50} movimientos adicionales (descarga el Excel para ver todo)`,
              { align: 'center' },
            );
          }
        }

        // Footer en cada página
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).fillColor('#9CA3AF').text(
            `Finanzas+ - Página ${i + 1} de ${pages.count}`,
            40,
            doc.page.height - 40,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
