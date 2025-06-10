import { renderToString } from 'react-dom/server';
import { pdf } from '@react-pdf/renderer';
import ContractDocument from './ContractDocument';

export default async function generateContractPdfBlob(contractData) {
  // 1. Render the ContractDocument component to a PDF
  const pdfDoc = <ContractDocument data={contractData} />;
  
  // 2. Generate the PDF as a blob
  const pdfBlob = await pdf(pdfDoc).toBlob();
  
  return pdfBlob;
}