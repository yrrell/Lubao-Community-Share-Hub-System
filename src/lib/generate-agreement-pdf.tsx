// ============================================================
// src/lib/generate-agreement-pdf.tsx
// Generates a printable Borrow Agreement PDF.
//
// Install:  npm install @react-pdf/renderer
// Usage:    Call from /api/agreements/[id]/pdf/route.ts
// ============================================================

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Transaction, BorrowAgreement, User, Tool } from "@/types";

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily:  "Helvetica",
    fontSize:     10,
    paddingTop:   40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #16a34a",
    paddingBottom: 12,
    alignItems: "center",
  },
  orgName: {
    fontSize:   18,
    fontFamily: "Helvetica-Bold",
    color:      "#15803d",
  },
  orgSub: {
    fontSize: 9,
    color:    "#6b7280",
    marginTop: 2,
  },
  title: {
    fontSize:   14,
    fontFamily: "Helvetica-Bold",
    color:      "#111827",
    marginTop:  16,
    marginBottom: 4,
    textAlign: "center",
  },
  txId: {
    fontSize:  9,
    color:     "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize:   10,
    fontFamily: "Helvetica-Bold",
    color:      "#374151",
    marginBottom: 6,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom:  4,
  },
  label: {
    width:      130,
    color:      "#6b7280",
    fontFamily: "Helvetica-Bold",
    fontSize:    9,
  },
  value: {
    flex:    1,
    color:   "#111827",
    fontSize: 9,
  },
  disclaimer: {
    fontSize:  8,
    color:     "#374151",
    backgroundColor: "#f9fafb",
    border:    "1px solid #e5e7eb",
    borderRadius: 4,
    padding:   10,
    marginBottom: 16,
    lineHeight: 1.6,
  },
  signaturesRow: {
    flexDirection: "row",
    gap:           40,
    marginTop:     10,
  },
  sigBlock: {
    flex:   1,
    alignItems: "center",
  },
  sigLabel: {
    fontSize:   9,
    color:      "#374151",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  sigImage: {
    width:  160,
    height:  70,
    objectFit: "contain",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    marginBottom: 4,
  },
  sigPlaceholder: {
    width:  160,
    height:  70,
    border: "1px solid #d1d5db",
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  sigName: {
    fontSize: 8,
    color:    "#374151",
    fontFamily: "Helvetica-Bold",
  },
  sigDate: {
    fontSize: 7,
    color:    "#6b7280",
    marginTop: 2,
  },
  footer: {
    position:  "absolute",
    bottom:    30,
    left:      50,
    right:     50,
    textAlign: "center",
    fontSize:  7,
    color:     "#9ca3af",
    borderTop: "1px solid #f3f4f6",
    paddingTop: 8,
  },
  profileRow: {
    flexDirection: "row",
    gap:           16,
    marginBottom:   14,
  },
  profileBlock: {
    flex:   1,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  profilePic: {
    width:  40,
    height: 40,
    borderRadius: 20,
    marginBottom:  6,
    objectFit: "cover",
  },
  profileRole: {
    fontSize:   8,
    color:      "#15803d",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  profileName: {
    fontSize:   10,
    fontFamily: "Helvetica-Bold",
    color:      "#111827",
  },
  profileSub: {
    fontSize: 8,
    color:    "#6b7280",
    marginTop: 1,
  },
});

// ── Helper: format timestamp ──────────────────────────────────────────────────
function fmt(ts: string | null | undefined, fallback = "—"): string {
  if (!ts) return fallback;
  return new Date(ts).toLocaleString("en-PH", {
    timeZone:     "Asia/Manila",
    dateStyle:    "long",
    timeStyle:    "short",
  });
}

// ── Agreement Document component ──────────────────────────────────────────────
interface AgreementDocProps {
  transaction:  Transaction;
  tool:         Tool;
  borrower:     User;
  lender:       User;
  agreement:    BorrowAgreement;
  baseUrl:      string;   // e.g. "https://yourdomain.com" for profile pic URLs
}

function AgreementDocument({
  transaction: tx,
  tool,
  borrower,
  lender,
  agreement,
  baseUrl,
}: AgreementDocProps) {
  const borrowerPicUrl = borrower.profile_pic?.startsWith("http")
    ? borrower.profile_pic
    : `${baseUrl}/${borrower.profile_pic}`;

  const lenderPicUrl = lender.profile_pic?.startsWith("http")
    ? lender.profile_pic
    : `${baseUrl}/${lender.profile_pic}`;

  return (
    <Document
      title={`Borrow Agreement – TX #${tx.id}`}
      author="Lubao Community Share Hub"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.orgName}>LUBAO COMMUNITY SHARE HUB</Text>
          <Text style={styles.orgSub}>Barangay Lending & Sharing Platform · Lubao, Pampanga</Text>
        </View>

        <Text style={styles.title}>BORROW AGREEMENT</Text>
        <Text style={styles.txId}>
          Transaction #{tx.id} · Agreement #{agreement.id} · Generated: {fmt(agreement.finalized_at)}
        </Text>

        {/* ── Parties (with profile pictures) ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTIES INVOLVED</Text>
          <View style={styles.profileRow}>

            {/* Borrower */}
            <View style={styles.profileBlock}>
              <Text style={styles.profileRole}>BORROWER</Text>
              {borrower.profile_pic && (
                <Image style={styles.profilePic} src={borrowerPicUrl} />
              )}
              <Text style={styles.profileName}>
                {borrower.first_name} {borrower.middle_name ? borrower.middle_name + " " : ""}{borrower.last_name}
              </Text>
              <Text style={styles.profileSub}>@{borrower.username}</Text>
              <Text style={styles.profileSub}>{borrower.email}</Text>
              {borrower.phone_number && (
                <Text style={styles.profileSub}>{borrower.phone_number}</Text>
              )}
              {borrower.full_address && (
                <Text style={styles.profileSub}>{borrower.full_address}</Text>
              )}
            </View>

            {/* Lender */}
            <View style={styles.profileBlock}>
              <Text style={styles.profileRole}>LENDER (TOOL OWNER)</Text>
              {lender.profile_pic && (
                <Image style={styles.profilePic} src={lenderPicUrl} />
              )}
              <Text style={styles.profileName}>
                {lender.first_name} {lender.middle_name ? lender.middle_name + " " : ""}{lender.last_name}
              </Text>
              <Text style={styles.profileSub}>@{lender.username}</Text>
              <Text style={styles.profileSub}>{lender.email}</Text>
              {lender.phone_number && (
                <Text style={styles.profileSub}>{lender.phone_number}</Text>
              )}
            </View>

          </View>
        </View>

        {/* ── Tool Information ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOOL / ITEM INFORMATION</Text>
          <View style={styles.row}><Text style={styles.label}>Tool Name:</Text>      <Text style={styles.value}>{tool.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Description:</Text>   <Text style={styles.value}>{tool.description ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Payment Method:</Text><Text style={styles.value}>{tx.payment_method.toUpperCase()}</Text></View>
          {tx.payment_ref && (
            <View style={styles.row}><Text style={styles.label}>GCash Ref #:</Text>  <Text style={styles.value}>{tx.payment_ref}</Text></View>
          )}
        </View>

        {/* ── Transaction Timeline ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRANSACTION TIMELINE (AUDIT TRAIL)</Text>
          <View style={styles.row}><Text style={styles.label}>Request Submitted:</Text> <Text style={styles.value}>{fmt(tx.created_at)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Lender Approved:</Text>   <Text style={styles.value}>{fmt(tx.approved_at)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Item Handed Over:</Text>  <Text style={styles.value}>{fmt(tx.active_at)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Item Returned:</Text>     <Text style={styles.value}>{fmt(tx.returned_at)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Agreement Finalized:</Text><Text style={styles.value}>{fmt(agreement.finalized_at)}</Text></View>
        </View>

        {/* ── Data Privacy Disclaimer ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA PRIVACY ACT CONSENT</Text>
          <Text style={styles.disclaimer}>
            Both parties hereby acknowledge that their personal information (name, contact details, government ID on file) is collected solely for the purpose of facilitating this community lending transaction in accordance with Republic Act No. 10173, the Data Privacy Act of 2012. This information will not be shared with third parties outside of this platform without explicit consent, and will be retained only for the duration required by applicable regulations. By signing below, both parties confirm their voluntary consent to the collection and processing of their personal data for this transaction.
          </Text>
        </View>

        {/* ── E-Signatures ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELECTRONIC SIGNATURES</Text>
          <View style={styles.signaturesRow}>

            {/* Borrower Signature */}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>BORROWER&apos;S SIGNATURE</Text>
              {agreement.borrower_signature ? (
                <Image style={styles.sigImage} src={agreement.borrower_signature} />
              ) : (
                <View style={styles.sigPlaceholder}>
                  <Text style={{ fontSize: 8, color: "#9ca3af" }}>Pending</Text>
                </View>
              )}
              <Text style={styles.sigName}>{borrower.first_name} {borrower.last_name}</Text>
              <Text style={styles.sigDate}>Signed: {fmt(agreement.borrower_agreed_at)}</Text>
            </View>

            {/* Lender Signature */}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>LENDER&apos;S SIGNATURE</Text>
              {agreement.lender_signature ? (
                <Image style={styles.sigImage} src={agreement.lender_signature} />
              ) : (
                <View style={styles.sigPlaceholder}>
                  <Text style={{ fontSize: 8, color: "#9ca3af" }}>Pending</Text>
                </View>
              )}
              <Text style={styles.sigName}>{lender.first_name} {lender.last_name}</Text>
              <Text style={styles.sigDate}>Signed: {fmt(agreement.lender_agreed_at)}</Text>
            </View>

          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <Text style={styles.footer}>
          This document is system-generated by Lubao Community Share Hub and is legally binding.
          Transaction ID: {tx.id} · Agreement ID: {agreement.id} · {fmt(agreement.finalized_at)}
        </Text>

      </Page>
    </Document>
  );
}

// ── Main export: generate PDF as Buffer ───────────────────────────────────────
export async function generateAgreementPDF(
  props: AgreementDocProps
): Promise<Buffer> {
  const instance = pdf(<AgreementDocument {...props} />);
  const blob     = await instance.toBlob();
  const arrayBuf = await blob.arrayBuffer();
  return Buffer.from(arrayBuf);
}
