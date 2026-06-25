import { getFieldValue } from './src/store/index.ts';

const org = { name: 'ACME CORPORATION', address: '123 Main Street, Tech City', phone: '012-345-6789', email: 'info@acme.com' };
const cardData = { name: 'JOHN DOE', role: 'SOFTWARE ENGINEER', contact: '9876543210' };
const el = { qrFields: ['name', 'role', 'orgName', 'orgAddress', 'contact', 'orgPhone', 'orgEmail'] };

const fields = el.qrFields;
const fieldLabelMap = {
    name: 'Name', role: 'Role', code: 'ID', dob: 'DOB', blood: 'Blood',
    contact: 'Contact', address: 'Address', issued: 'Issued', valid: 'Valid',
    emergency: 'Emergency', orgName: 'Org', orgAddress: 'Address', orgPhone: 'OrgPhone',
    orgEmail: 'OrgEmail', orgWebsite: 'Website', orgTagline: 'Tagline', orgEmergency: 'OrgEmergency',
    custom1: 'Custom1', custom2: 'Custom2', custom3: 'Custom3'
};

const lines = [];
for (const f of fields) {
    const label = fieldLabelMap[f] || f;
    const value = getFieldValue(cardData, f, org);
    if (value) lines.push(`${label}: ${value}`);
}

const result = lines.join(' / ');
console.log("QR Data:", result || cardData.code || cardData.name || 'ID');
