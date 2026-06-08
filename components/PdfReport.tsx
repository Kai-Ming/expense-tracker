/* import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 1. The PDF Export Button Component
function ExportPdfButton({ documentTitle, reportData }) {
  
  const handleExport = () => {
    const printWindow = window.open('', '_blank');
    
    const htmlLayout = `
      <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; }
            h2 { color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>${documentTitle}</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlLayout);
    printWindow.document.close();
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleExport}>
      <Text style={styles.btnText}>Print ${documentTitle}</Text>
    </TouchableOpacity>
  );
}

// 2. Parent Component passing the data down
export default function PdfReport() {
  // Your dynamic data (e.g., from an API state or form)
  const currentInvoices = [
    { id: 'INV-001', name: 'Premium Subscription', price: '$99.00' },
    { id: 'INV-002', name: 'Extra Cloud Storage', price: '$15.00' },
    { id: 'INV-003', name: 'Consulting Hour', price: '$150.00' },
  ];

  return (
    <View style={styles.container}>
      <ExportPdfButton 
        documentTitle="Customer Invoice" 
        reportData={currentInvoices} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btn: { backgroundColor: '#1e40af', padding: 14, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: '600' }
}); */
