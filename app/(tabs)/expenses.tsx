import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, Modal, Pressable, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import MapDisplay from '@/components/MapDisplay'; // Check if this should be { MapDisplay }
import { db } from '../../firebaseConfig'; // Assuming firebaseConfig is correctly set up
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

interface Expense {
  id: string;
  distance: number;
  date?: string;
  from_address: string;
  to_address: string;
  purpose: string;
  from_time?: string;
  to_time?: string;
  duration?: string;
  company: string;
  name: string;
  trip_summary?: string;
  contact_number: string;
  parking: number;
  toll: number;
  mileage: number;
  cost: number;
  user_id: string; 
  business_card_url?: string;
  approval_status: number;
  createdAt: any;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch role from Firestore users collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
        setUserId(null);
        setRole(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      return;
    }

    const q = query(collection(db, "expenses"), where("user_id", "==", userId), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleStatus = async (id: string, status: number) => {
    try {
      const docRef = doc(db, "expenses", id);
      await updateDoc(docRef, { approval_status: status });
    } catch (error) {
      console.error("Error approving expense:", error);
    }
  };

  const exportToCSV = () => {
    if (Platform.OS !== 'web') return;
    
    const headers = ["Date", "Name", "Company", "Purpose", "From", "To", "Distance (km)", "Duration", "Parking (RM)", "Toll (RM)", "Total Cost (RM)", "Status"];
    const csvData = expenses.map(e => [
      e.date || (e.createdAt ? e.createdAt.toDate().toLocaleDateString() : 'N/A'),
      e.name,
      `"${e.company}"`,
      `"${e.purpose}"`,
      `"${e.from_address}"`,
      `"${e.to_address}"`,
      e.distance,
      e.duration || '',
      e.parking,
      e.toll,
      e.cost,
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToHTML = () => {
    if (Platform.OS !== 'web') return;

    const filteredExpenses = expenses.filter(e => {
      if (!e.date) return true;
      const dateVal = e.date;
      if (startDate && dateVal < startDate) return false;
      if (endDate && dateVal > endDate) return false;
      return true;
    });

    if (filteredExpenses.length === 0) {
      alert("No expenses found for the selected date range.");
      return;
    }

    // 1. Updated Headers Order
    const headers = [
      "Date", "From", "To", "Purpose", "Company/Site", 
      "Name", "Contact No.","From Time", "To Time", "Duration", "Parking (RM)", 
      "Toll (RM)", "Mileage (RM)", "Cost (RM)"
    ];

    // 2. Updated Row Mapping Order
    const rows = filteredExpenses.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.from_address}</td>
        <td>${e.to_address}</td>
        <td>${e.purpose}</td>
        <td>${e.company || ''}</td>
        <td>${e.name}</td>
        <td>${e.contact_number || ''}</td>
        <td>${e.from_time || ''}</td>
        <td>${e.to_time || ''}</td>
        <td>${e.duration || ''}</td>
        <td>${e.parking.toFixed(2)}</td>
        <td>${e.toll.toFixed(2)}</td>
        <td>${e.mileage.toFixed(2)}</td>
        <td>${e.cost.toFixed(2)}</td>
      </tr>
    `).join("");

    const totalParking = filteredExpenses.reduce((sum, e) => sum + (e.parking || 0), 0);
    const totalToll = filteredExpenses.reduce((sum, e) => sum + (e.toll || 0), 0);
    const totalMileage = filteredExpenses.reduce((sum, e) => sum + (e.mileage || 0), 0);
    const totalCost = filteredExpenses.reduce((sum, e) => sum + (e.cost || 0), 0);

    const footerRow = `
      <tr style="font-weight: bold; background-color: #eee;">
        <td colspan="10" style="text-align: right;">TOTAL:</td>
        <td>${totalParking.toFixed(2)}</td>
        <td>${totalToll.toFixed(2)}</td>
        <td>${totalMileage.toFixed(2)}</td>
        <td>${totalCost.toFixed(2)}</td>
      </tr>
    `;

    const detailsHtml = filteredExpenses.map(e => `
      <div class="expense-detail">
        <h3>${e.company}, ${e.name} - ${e.purpose} (${e.date || 'N/A'} ${e.from_time}-${e.to_time})</h3>
        <p><strong>From:</strong> ${e.from_address}</p>
        <p><strong>To:</strong> ${e.to_address}</p>
        <p><strong>Purpose:</strong> ${e.purpose}</p>
        <p><strong>Company/Site:</strong> ${e.company}</p>
        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Contact No.:</strong> ${e.contact_number}</p>
        <p><strong>From Time:</strong> ${e.from_time}</p>
        <p><strong>To Time:</strong> ${e.to_time}</p>
        <p><strong>Duration:</strong> ${e.duration}</p>
        <p><strong>Parking (RM):</strong> ${e.parking.toFixed(2)}</p>
        <p><strong>Toll (RM):</strong> ${e.toll.toFixed(2)}</p>
        <p><strong>Mileage (RM):</strong> ${e.mileage.toFixed(2)}</p>
        <p><strong>Cost (RM):</strong> ${e.cost.toFixed(2)}</p>
        <p><strong>Trip Summary:</strong> ${e.trip_summary}</p>
        ${e.business_card_url ? `
          <div class="image-container">
            <strong>Business Card:</strong><br/>
            <img src="${e.business_card_url}" alt="Business Card" />
          </div>
        ` : '<p><em>No business card attached</em></p>'}
      </div>
    `).join("<hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Expense Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 40px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #808080; color: white; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          h2 { color: #808080; }
          .expense-detail { margin-top: 20px; page-break-inside: avoid; }
          .expense-detail h3 { border-bottom: 2px solid #808080; padding-bottom: 5px; color: #808080; }
          .image-container img { max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h2>Expense Report - Generated on ${new Date().toLocaleDateString()}</h2>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows}
            ${footerRow}
          </tbody>
        </table>

        <h2 style="margin-top: 60px;">Detailed Records</h2>
        ${detailsHtml}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${new Date().toISOString().split('T')[0]}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const format12Hour = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hours24, minutes] = timeStr.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const hoursStr = hours12.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    return `${hoursStr}:${minutesStr} ${period}`;
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedId(isExpanded ? null : item.id)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>{item.purpose}</Text>
          <Text style={styles.cost}>RM {item.cost.toFixed(2)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.companyText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.date}>{item.date || 'N/A'}</Text>
        </View>
        <View style={[styles.cardFooter, { marginTop: 2 }]}>
          <Text style={[styles.companyText, { fontSize: 13 }]} numberOfLines={1}>{item.company}</Text>
          {(item.from_time && item.to_time) && (
            <Text style={[styles.date, { fontSize: 13 }]}>{format12Hour(item.from_time)} - {format12Hour(item.to_time)}</Text>
          )}
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.separator} />
            
            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Route:</Text>
              <Text style={styles.descriptionText}>{item.from_address || 'N/A'} → {item.to_address || 'N/A'}</Text>
              
              {(item.from_time && item.to_time) && (
                <>
                  <Text style={styles.descriptionLabel}>Time & Duration:</Text>
                  <Text style={styles.descriptionText}>{format12Hour(item.from_time)} - {format12Hour(item.to_time)} ({item.duration})</Text>
                </>
              )}
              
              <Text style={styles.descriptionLabel}>Trip Summary:</Text>
              <Text style={styles.descriptionText}>{item.trip_summary || 'N/A'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Person Visited:</Text>
              <Text style={styles.descriptionText}>{item.name || 'N/A'}</Text>
              <Text style={styles.descriptionLabel}>Contact Number:</Text>
              <Text style={styles.descriptionText}>{item.contact_number || 'N/A'}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mileage:</Text>
                <Text style={styles.detailValue}>RM {item.mileage.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Toll:</Text>
                <Text style={styles.detailValue}>RM {item.toll.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Parking:</Text>
                <Text style={styles.detailValue}>RM {item.parking.toFixed(2)}</Text>
              </View>
              <View style={[styles.detailRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 4 }]}>
                <Text style={[styles.detailLabel, { fontWeight: 'bold', color: '#333' }]}>Total Cost:</Text>
                <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#2196F3' }]}>RM {item.cost.toFixed(2)}</Text>
              </View>
            </View>

            {item.business_card_url && (
              <>
                <Text style={styles.sectionHeader}>Business Card</Text>
                <TouchableOpacity onPress={() => setSelectedImage(item.business_card_url || null)}>
                  <Image source={{ uri: item.business_card_url }} style={styles.businessCardImage} resizeMode="contain" />
                </TouchableOpacity>
              </>
            )}
            {role == 0 && item.approval_status == 0 && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleStatus(item.id, 1)}>
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => handleStatus(item.id, 2)}>
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.reportSummaryCard}>
      <Text style={styles.reportSummaryTitle}>{role === 0 ? "Organization" : "My"} Expense Report</Text>
      <View style={styles.reportSummaryRow}>
        <View style={styles.reportSummaryItem}>
          <Text style={styles.reportSummaryLabel}>Total Reimbursement</Text>
          <Text style={styles.reportSummaryValue}>RM {expenses.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}</Text>
        </View>
        <View style={styles.reportSummaryItem}>
          <Text style={styles.reportSummaryLabel}>Total Distance</Text>
          <Text style={styles.reportSummaryValue}>{expenses.reduce((sum, e) => sum + e.distance, 0).toFixed(2)} km</Text>
        </View>
      </View>
      {Platform.OS === 'web' && (
        <View style={{ marginTop: 20, backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, backgroundColor: 'transparent', alignItems: 'flex-end' }}>
            <View style={{ flex: 1, marginRight: 12, backgroundColor: 'transparent' }}>
              <Text style={{ color: '#fff', fontSize: 11, marginBottom: 4, fontWeight: '600' }}>Start Date</Text>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </View>
            <View style={{ flex: 1, marginRight: 12, backgroundColor: 'transparent' }}>
              <Text style={{ color: '#fff', fontSize: 11, marginBottom: 4,  fontWeight: '600' }}>End Date</Text>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }} 
              onPress={() => { setStartDate(''); setEndDate(''); }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Reset</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={exportToHTML}>
            <Text style={styles.exportButtonText}>Generate HTML Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <MapDisplay />}
      <FlatList
        data={expenses}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No expenses submitted yet.</Text>}
      />
      <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedImage(null)}>
          <View style={styles.modalContent}>
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeButtonText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, backgroundColor: 'transparent' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 8 },
  cost: { fontSize: 16, fontWeight: 'bold', color: '#2196F3' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  expandedContent: { marginTop: 12, backgroundColor: 'transparent' },
  separator: { height: 1, backgroundColor: '#eee', marginBottom: 12 },
  descriptionLabel: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 4 },
  businessCardImage: { width: '100%', height: 200, marginTop: 4, borderRadius: 4, backgroundColor: '#f9f9f9' },
  date: { fontSize: 14, color: '#999' },
  companyText: { fontSize: 14, color: '#666', flex: 1, marginRight: 8 },
  section: { marginBottom: 16 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#2196F3', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, backgroundColor: 'transparent' },
  detailLabel: { fontSize: 14, color: '#777' },
  detailValue: { fontSize: 14, color: '#333' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  fullImage: { width: '100%', height: '100%' },
  closeButton: { marginTop: 20, backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 25 },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', marginTop: 24, backgroundColor: 'transparent', maxWidth: 250 },
  approveButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 6, alignItems: 'center', flex: 1, marginRight: 8 },
  approveButtonText: { color: '#fff', fontWeight: 'bold' },
  rejectButton: { backgroundColor: '#F44336', padding: 12, borderRadius: 6, alignItems: 'center', flex: 1 },
  rejectButtonText: { color: '#fff', fontWeight: 'bold' },
  reportSummaryCard: { backgroundColor: '#2196F3', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  reportSummaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  reportSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent', marginBottom: 15 },
  reportSummaryItem: { backgroundColor: 'transparent' },
  reportSummaryLabel: { fontSize: 12, color: '#e3f2fd', marginBottom: 4 },
  reportSummaryValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  exportButton: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  exportButtonText: { color: '#2196F3', fontWeight: 'bold', fontSize: 14 },
});