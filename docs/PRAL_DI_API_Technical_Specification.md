# PRAL Digital Invoicing (DI) API – Technical Specification

**Source:** Technical Specification for DI API, User Manual **Version 1.12**  
**Publisher:** Pakistan Revenue Automation (Pvt.) Ltd. (PRAL)  
**Last update (from document):** 24-July-2025  

*This document is a project reference extracted from the official PRAL PDF. For the authoritative specification, obtain the original from PRAL.*

---

## 1. Purpose

This specification enables Supply Chain Operators to integrate with FBR for **Digital Invoice** data sharing:

- ERPs/systems register with FBR and integrate as per the integration steps.
- Data sharing is **real-time** via Web API.

---

## 2. Web API Security

- Every request must include a **security token** in the HTTP header.
- Token is issued by PRAL (validity: 5 years); renew before expiry.
- In the request header, pass: **`Authorization: Bearer <token>`**

---

## 3. Digital Invoicing API Endpoints

Base routing: same URLs for Sandbox and Production; environment is determined by the **security token**.

### 3.1 Post Invoice Data

Submit invoice data to FBR and receive an invoice number.

| Environment | URL |
|-------------|-----|
| **Sandbox** | `https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb` |
| **Production** | `https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata` |

**Sample request (production):**

```json
{
  "invoiceType": "Sale Invoice",
  "invoiceDate": "2025-04-21",
  "sellerNTNCNIC": "7 or 13 digit seller NTN/CNIC",
  "sellerBusinessName": "Company 8",
  "sellerProvince": "Sindh",
  "sellerAddress": "Karachi",
  "buyerNTNCNIC": "7 or 13 digit buyer NTN/CNIC",
  "buyerBusinessName": "Buyer Name",
  "buyerProvince": "Sindh",
  "buyerAddress": "Karachi",
  "buyerRegistrationType": "Registered",
  "invoiceRefNo": "",
  "items": [
    {
      "hsCode": "0101.2100",
      "productDescription": "Product Description",
      "rate": "18%",
      "uoM": "Numbers, pieces, units",
      "quantity": 1.0000,
      "totalValues": 0.00,
      "valueSalesExcludingST": 1000.00,
      "fixedNotifiedValueOrRetailPrice": 0.00,
      "salesTaxApplicable": 180.00,
      "salesTaxWithheldAtSource": 0.00,
      "extraTax": 0.00,
      "furtherTax": 120.00,
      "sroScheduleNo": "SRO123",
      "fedPayable": 0.00,
      "discount": 0.00,
      "saleType": "Goods at standard rate (default)",
      "sroItemSerialNo": ""
    }
  ]
}
```

**Sandbox only:** Include `"scenarioId": "SN001"` (see Scenarios for Sandbox Testing).

**Valid response example:**

```json
{
  "invoiceNumber": "7000007DI1747119701593",
  "dated": "2025-05-13 12:01:41",
  "validationResponse": {
    "statusCode": "00",
    "status": "Valid",
    "error": "",
    "invoiceStatuses": [
      {
        "itemSNo": "1",
        "statusCode": "00",
        "status": "Valid",
        "invoiceNo": "7000007DI1747119701593-1",
        "errorCode": "",
        "error": ""
      }
    ]
  }
}
```

**Invalid response (header-level):** `statusCode`: "01", `status`: "Invalid", `errorCode` and `error` populated.

### 3.2 Validate Invoice Data

Validate invoice payload without posting. Same JSON structure as Post.

| Environment | URL |
|-------------|-----|
| **Sandbox** | `https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata_sb` |
| **Production** | `https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata` |

Response uses same `validationResponse` structure; no FBR invoice number is issued.

### 3.3 HTTP Status Codes (DI APIs)

| Code | Meaning |
|------|---------|
| 200 | OK |
| 401 | Unauthorized |
| 500 | Internal Server Error (contact administrator) |

---

## 4. Invoice Field Summary

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| invoiceType | string | Yes | "Sale Invoice" or "Debit Note" |
| invoiceDate | date | Yes | YYYY-MM-DD |
| sellerNTNCNIC | string | Yes | 7 or 13 digits |
| sellerBusinessName | string | Yes | Seller legal/business name |
| sellerProvince | string | Yes | From reference API (provinces) |
| sellerAddress | string | Yes | Seller address |
| buyerNTNCNIC | string | Yes (or optional if Unregistered) | 7 or 13 digits |
| buyerBusinessName | string | Yes | Buyer name |
| buyerProvince | string | Yes | From reference API |
| buyerAddress | string | Yes | Buyer address |
| buyerRegistrationType | string | Yes | "Registered" or "Unregistered" |
| invoiceRefNo | string | Required for Debit Note | 22 digits (NTN) or 28 (CNIC) for reference invoice |
| scenarioId | string | Sandbox only | e.g. "SN001" |

### Line item fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hsCode | string | Yes | HS Code |
| productDescription | string | Yes | Product/service description |
| rate | string | Yes | e.g. "18%" (from reference API SaleTypeToRate) |
| uoM | string | Yes | From reference API (UOM) |
| quantity | number | Yes | Quantity |
| totalValues | number | Yes | Total including tax |
| valueSalesExcludingST | number | Yes | Sales value excluding ST |
| fixedNotifiedValueOrRetailPrice | number | Yes | Item-based fixed/retail price |
| salesTaxApplicable | number | Yes | Sales tax / FED in ST mode |
| salesTaxWithheldAtSource | number | Yes | ST withheld at source |
| extraTax | number | Optional | Extra tax |
| furtherTax | number | Optional | Further tax |
| sroScheduleNo | string | Optional | SRO schedule number |
| fedPayable | number | Optional | FED payable |
| discount | number | Optional | Discount |
| saleType | string | Yes | e.g. "Goods at standard rate (default)" |
| sroItemSerialNo | string | Optional | SRO item serial |

---

## 5. Digital Invoicing Reference APIs (Lookups)

All reference APIs use **Bearer token** in `Authorization` header. Base host: `https://gw.fbr.gov.pk`.

| Purpose | Path | Method | Notes |
|---------|------|--------|-------|
| Province codes | `/pdi/v1/provinces` | GET | No request body |
| Document type ID | `/pdi/v1/doctypecode` | GET | e.g. Sale Invoice, Debit Note |
| Item (HS) code | `/pdi/v1/itemdesccode` | GET | HS codes and descriptions |
| SRO item ID | `/pdi/v1/sroitemcode` | GET | SRO item list |
| Transaction type ID | `/pdi/v1/transtypecode` | GET | Transaction types |
| UOM ID | `/pdi/v1/uom` | GET | Units of measure |
| SRO schedule | `/pdi/v1/SroSchedule?rate_id=413&date=04-Feb-2024&origination_supplier_csv=1` | GET | Query params |
| Rate (sale type to rate) | `/pdi/v2/SaleTypeToRate?date=24-Feb-2024&transTypeId=18&originationSupplier=1` | GET | Query params |
| HS code with UOM | `/pdi/v2/HS_UOM?hs_code=5904.9000&annexure_id=3` | GET | Query params |
| SRO item (v2) | `/pdi/v2/SROItem?date=2025-03-25&sro_id=389` | GET | Query params |
| STATL | `/dist/v1/statl` | GET | Request body e.g. `{"regno":"0788762","date":"2025-05-18"}` |
| Registration type | `/dist/v1/Get_Reg_Type` | GET | Request body e.g. `{"Registration_No":"0788762"}` |

Same HTTP status codes (200, 401, 500) apply.

---

## 6. Logo & QR Code

- FBR Digital Invoicing System **logo** and **QR code** must be printed on each invoice.
- QR: Version 2.0 (25×25), size **1.0 × 1.0 inch**.

---

## 7. Sales Error Codes (selected)

| Code | Brief description |
|------|-------------------|
| 0001 | Seller not registered for sales tax; provide valid NTN |
| 0002 | Invalid buyer registration/NTN format (13 digits CNIC, 7/9 NTN) |
| 0003 | Provide proper invoice type |
| 0005 | Invoice date format; use YYYY-MM-DD |
| 0009 | Provide buyer registration number |
| 0010 | Provide buyer name |
| 0012 | Provide buyer registration type |
| 0013 | Provide valid sale type |
| 0018 | Provide sales tax/FED in ST mode |
| 0019 | Provide HS code |
| 0020 | Provide rate |
| 0044 | Provide HS code |
| 0046 | Provide rate (as per selected sale type) |
| 0052 | Valid HS code against invoice/sale type |
| 0053 | Valid buyer registration type |
| 0401 | Seller NTN/CNIC not 7 or 13 digits or token not authorized |
| 0402 | Buyer NTN/CNIC not 7 or 13 digits or token not authorized |

Full list is in the official PDF (Section 7).

---

## 8. Purchase Error Codes (selected)

| Code | Brief description |
|------|-------------------|
| 0156 | Invalid NTN/Reg no |
| 0157 | Buyer not registered; provide valid registration/NTN |
| 0158 | Mismatch buyer registration no |
| 0160 | Provide buyer name |
| 0162 | Provide sale type |
| 0167 | Provide value of sales excl. ST |
| 0174 | Provide sales tax |
| 0176 | Provide ST withheld at source |
| 0177 | Provide further tax |

Full list is in the official PDF (Section 8).

---

## 9. Scenarios for Sandbox Testing

Use `scenarioId` in sandbox requests. Examples:

| Scenario | Description |
|----------|-------------|
| SN001 | Goods at standard rate to registered buyers |
| SN002 | Goods at standard rate to unregistered buyers |
| SN003 | Sale of steel (melted and re-rolled) |
| SN007 | Zero rated sale |
| SN010 | Telecom services |
| SN019 | Services rendered or provided |
| SN026–SN028 | Sale to end consumer by retailers (if registered as retailer) |

Full mapping is in the official PDF (Sections 9 and 10).

---

## 10. Applicable Scenarios by Business Activity

Business activity (Manufacturer, Importer, Distributor, Wholesaler, Exporter, Retailer, Service Provider, Other) and sector determine which scenario IDs (e.g. SN001, SN008) are allowed. The full matrix is in the official PDF (Section 10).

---

## Reference

- **Original document:** PRAL Technical Specification for DI API, User Manual, Version 1.12 (PDF).  
- **Contact:** PRAL – Head office, Software Technology Park-III, Plot No. 156, Service Road (North), Industrial Area, I-9/3, Islamabad, Pakistan.
