/**
 * API service for calling backend endpoints
 */

// Vite exposes env vars via import.meta.env; fall back to localhost if not set
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000'

/**
 * Submit data and PDF path to backend
 * @param {Object} data - Data object to send (can contain any fields)
 * @param {string} pdfPath - PDF file directory/path
 * @returns {Promise<Object>} Response from server
 */
export async function submitPdfData(data, pdfPath) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pdf/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        pdfPath,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

/**
 * Get available PDF files from a directory
 * @param {string} directory - Directory path
 * @returns {Promise<Object>} List of PDF files
 */
export async function getPdfList(directory) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pdf/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ directory }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}
