import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register fonts for better typography
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.cdnfonts.com/s/29136/Helvetica.woff' },
    { src: 'https://fonts.cdnfonts.com/s/29136/Helvetica-Bold.woff', fontWeight: 'bold' },
  ],
});

// Common styles
const commonStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    marginBottom: 30,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  companyDetails: {
    fontSize: 10,
    color: '#666',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
    color: '#000',
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: '#000',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 35,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
});

// Invoice data interfaces
export interface InvoiceCompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

export interface InvoiceRecipient {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  unitNumber?: string;
}

export interface TenantInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  company: InvoiceCompanyInfo;
  recipient: InvoiceRecipient;
  propertyAddress: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  usage: {
    tenantKwh: number;
    propertyTotalKwh: number;
    tenantRatio: number;
  };
  costs: {
    electricRate: number;
    directCost: number;
    stateSalesTax: number;
    grossReceiptTax: number;
    adjustment: number;
    deliveryCharges: number;
    total: number;
  };
  notes?: string;
  calculationBreakdown?: string;
}

// Utility Bill Pro-Rata Invoice Template
export const TenantProRataInvoice: React.FC<{ data: TenantInvoiceData }> = ({ data }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header */}
        <View style={commonStyles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              {data.company.logo && (
                <Image
                  src={data.company.logo}
                  style={{ width: 120, height: 40, marginBottom: 10 }}
                />
              )}
              <Text style={commonStyles.companyName}>{data.company.name}</Text>
              <View style={commonStyles.companyDetails}>
                {data.company.address && <Text>{data.company.address}</Text>}
                {data.company.phone && <Text>Phone: {data.company.phone}</Text>}
                {data.company.email && <Text>Email: {data.company.email}</Text>}
              </View>
            </View>
            <View style={{ width: 200 }}>
              <Text style={commonStyles.invoiceTitle}>INVOICE</Text>
              <View style={commonStyles.section}>
                <Text style={commonStyles.label}>Invoice Number</Text>
                <Text style={commonStyles.value}>{data.invoiceNumber}</Text>
              </View>
              <View style={commonStyles.section}>
                <Text style={commonStyles.label}>Invoice Date</Text>
                <Text style={commonStyles.value}>
                  {format(new Date(data.invoiceDate), 'MMM dd, yyyy')}
                </Text>
              </View>
              {data.dueDate && (
                <View style={commonStyles.section}>
                  <Text style={commonStyles.label}>Due Date</Text>
                  <Text style={[commonStyles.value, { fontWeight: 'bold' }]}>
                    {format(new Date(data.dueDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={[commonStyles.section, { marginBottom: 30 }]}>
          <Text style={[commonStyles.label, { fontSize: 12, fontWeight: 'bold' }]}>BILL TO</Text>
          <Text style={[commonStyles.value, { fontWeight: 'bold', marginTop: 5 }]}>
            {data.recipient.name}
          </Text>
          {data.recipient.unitNumber && (
            <Text style={commonStyles.value}>Unit: {data.recipient.unitNumber}</Text>
          )}
          {data.recipient.address && (
            <Text style={commonStyles.value}>{data.recipient.address}</Text>
          )}
          {data.recipient.email && (
            <Text style={commonStyles.value}>{data.recipient.email}</Text>
          )}
        </View>

        {/* Property & Period Info */}
        <View style={[commonStyles.section, { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 4 }]}>
          <View style={commonStyles.row}>
            <View>
              <Text style={commonStyles.label}>Property</Text>
              <Text style={commonStyles.value}>{data.propertyAddress}</Text>
            </View>
            <View>
              <Text style={commonStyles.label}>Billing Period</Text>
              <Text style={commonStyles.value}>
                {format(new Date(data.billingPeriod.startDate), 'MMM dd, yyyy')} - {' '}
                {format(new Date(data.billingPeriod.endDate), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Summary */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { fontSize: 14, fontWeight: 'bold', marginBottom: 10 }]}>
            USAGE SUMMARY
          </Text>
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Description</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Usage (kWh)</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Percentage</Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Your Usage</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {data.usage.tenantKwh.toLocaleString()}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatPercent(data.usage.tenantRatio)}
              </Text>
            </View>
            <View style={[commonStyles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Property Total</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {data.usage.propertyTotalKwh.toLocaleString()}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>100.00%</Text>
            </View>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { fontSize: 14, fontWeight: 'bold', marginBottom: 10 }]}>
            COST BREAKDOWN
          </Text>
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>Description</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>
                Electricity Usage ({data.usage.tenantKwh} kWh × ${data.costs.electricRate.toFixed(4)}/kWh)
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.costs.directCost)}
              </Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>State Sales Tax (Pro-rata)</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.costs.stateSalesTax)}
              </Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>Gross Receipt Tax (Pro-rata)</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.costs.grossReceiptTax)}
              </Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>Adjustment (Pro-rata)</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.costs.adjustment)}
              </Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>Delivery Charges (Pro-rata)</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.costs.deliveryCharges)}
              </Text>
            </View>
            <View style={[commonStyles.tableRow, { borderBottomWidth: 0, backgroundColor: '#f5f5f5' }]}>
              <Text style={[commonStyles.tableCell, { flex: 3, fontWeight: 'bold', fontSize: 12 }]}>
                TOTAL DUE
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 12 }]}>
                {formatCurrency(data.costs.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.label, { fontSize: 12, fontWeight: 'bold', marginBottom: 5 }]}>
              NOTES
            </Text>
            <Text style={[commonStyles.value, { fontSize: 10, lineHeight: 1.5 }]}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={commonStyles.footer}>
          <Text style={commonStyles.footerText}>
            This invoice uses pro-rata allocation based on your actual usage percentage of the total property consumption.
          </Text>
          <Text style={commonStyles.footerText}>
            Please remit payment by the due date to avoid late fees.
          </Text>
          {data.company.website && (
            <Text style={commonStyles.footerText}>
              Visit our website: {data.company.website}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

// Basic Meter Invoice Template
export interface BasicMeterInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  company: InvoiceCompanyInfo;
  recipient: InvoiceRecipient;
  propertyAddress: string;
  meterReading: {
    startDate: string;
    endDate: string;
    previousReading: number;
    currentReading: number;
    usage: number;
  };
  rate: number;
  total: number;
  notes?: string;
}

export const BasicMeterInvoice: React.FC<{ data: BasicMeterInvoiceData }> = ({ data }) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header - Similar to pro-rata invoice */}
        <View style={commonStyles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              {data.company.logo && (
                <Image
                  src={data.company.logo}
                  style={{ width: 120, height: 40, marginBottom: 10 }}
                />
              )}
              <Text style={commonStyles.companyName}>{data.company.name}</Text>
              <View style={commonStyles.companyDetails}>
                {data.company.address && <Text>{data.company.address}</Text>}
                {data.company.phone && <Text>Phone: {data.company.phone}</Text>}
                {data.company.email && <Text>Email: {data.company.email}</Text>}
              </View>
            </View>
            <View style={{ width: 200 }}>
              <Text style={commonStyles.invoiceTitle}>INVOICE</Text>
              <View style={commonStyles.section}>
                <Text style={commonStyles.label}>Invoice Number</Text>
                <Text style={commonStyles.value}>{data.invoiceNumber}</Text>
              </View>
              <View style={commonStyles.section}>
                <Text style={commonStyles.label}>Invoice Date</Text>
                <Text style={commonStyles.value}>
                  {format(new Date(data.invoiceDate), 'MMM dd, yyyy')}
                </Text>
              </View>
              {data.dueDate && (
                <View style={commonStyles.section}>
                  <Text style={commonStyles.label}>Due Date</Text>
                  <Text style={[commonStyles.value, { fontWeight: 'bold' }]}>
                    {format(new Date(data.dueDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={[commonStyles.section, { marginBottom: 30 }]}>
          <Text style={[commonStyles.label, { fontSize: 12, fontWeight: 'bold' }]}>BILL TO</Text>
          <Text style={[commonStyles.value, { fontWeight: 'bold', marginTop: 5 }]}>
            {data.recipient.name}
          </Text>
          {data.recipient.unitNumber && (
            <Text style={commonStyles.value}>Unit: {data.recipient.unitNumber}</Text>
          )}
          {data.recipient.address && (
            <Text style={commonStyles.value}>{data.recipient.address}</Text>
          )}
        </View>

        {/* Meter Reading Details */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { fontSize: 14, fontWeight: 'bold', marginBottom: 10 }]}>
            METER READING DETAILS
          </Text>
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Description</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Reading</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Date</Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Previous Reading</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {data.meterReading.previousReading}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {format(new Date(data.meterReading.startDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>Current Reading</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {data.meterReading.currentReading}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {format(new Date(data.meterReading.endDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            <View style={[commonStyles.tableRow, { borderBottomWidth: 0, backgroundColor: '#f5f5f5' }]}>
              <Text style={[commonStyles.tableCell, { flex: 2, fontWeight: 'bold' }]}>Total Usage</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                {data.meterReading.usage} kWh
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1 }]}></Text>
            </View>
          </View>
        </View>

        {/* Charges */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.label, { fontSize: 14, fontWeight: 'bold', marginBottom: 10 }]}>
            CHARGES
          </Text>
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>Description</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>
                Electricity Usage ({data.meterReading.usage} kWh × ${data.rate.toFixed(4)}/kWh)
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatCurrency(data.total)}
              </Text>
            </View>
            <View style={[commonStyles.tableRow, { borderBottomWidth: 0, backgroundColor: '#f5f5f5' }]}>
              <Text style={[commonStyles.tableCell, { flex: 3, fontWeight: 'bold', fontSize: 12 }]}>
                TOTAL DUE
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 12 }]}>
                {formatCurrency(data.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.label, { fontSize: 12, fontWeight: 'bold', marginBottom: 5 }]}>
              NOTES
            </Text>
            <Text style={[commonStyles.value, { fontSize: 10, lineHeight: 1.5 }]}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={commonStyles.footer}>
          <Text style={commonStyles.footerText}>
            Please remit payment by the due date to avoid late fees.
          </Text>
          {data.company.website && (
            <Text style={commonStyles.footerText}>
              Visit our website: {data.company.website}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};