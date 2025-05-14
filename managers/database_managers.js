const { google } = require('googleapis');

async function connectSheets({ email, key, scopes }) {
    const auth = new google.auth.JWT({
        email: email,
        key: key,
        scopes: scopes,
    });

    return google.sheets({ version: 'v4', auth });
}

async function getWorkspaceList(sheets, spreadsheetId) {
    const workspaceData = await sheets.spreadsheets.get({ spreadsheetId });
    return workspaceData.data.sheets.map(sheet => sheet.properties.title);
}

const encryptedStatus = async (sheets, spreadsheetId) => {
    const listWorkspace = await getWorkspaceList(sheets, spreadsheetId);
    let encryptedStatus;

    for (const sheetName of listWorkspace) {
        if (sheetName === 'WebMode') {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A5:B5`,
            });
            if (response.data.values && response.data.values[0]) {
                encryptedStatus = response.data.values[0][1].toUpperCase() == 'TRUE';
            }
        }
    }
    return encryptedStatus;
}

const passwordData = {
    get: async (sheets, spreadsheetId) => {
        const listWorkspace = await getWorkspaceList(sheets, spreadsheetId);
        const password = {};

        for (const sheetName of listWorkspace) {
            if (sheetName.startsWith("DataPassword")) {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A5:G100`,
                });

                if (response.data.values) {
                    response.data.values.forEach(row => {
                        if (row[0] && row[1]) {
                            password[row[0].toLowerCase().replace(/ /g, "_")] = row[1];
                        }
                    });
                }
            }
        }
        return password;
    },
    change: async (sheets, spreadsheetId, newPassword) => {
        const listWorkspace = await getWorkspaceList(sheets, spreadsheetId);

        for (const sheetName of listWorkspace) {
            if (sheetName.startsWith("DataPassword")) {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A5:G100`,
                });

                if (response.data.values) {
                    const data = response.data.values;
                    const newData = data.map(row => {
                        if (row[0] && newPassword[row[0].toLowerCase().replace(/ /g, "_")]) {
                            row[1] = newPassword[row[0].toLowerCase().replace(/ /g, "_")];
                        }
                        return row;
                    });

                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!A5:G100`,
                        valueInputOption: 'RAW',
                        requestBody: { values: newData },
                    });
                }
            }
        }
    },
}

const mainData = {
    get: async (sheets, spreadsheetId) => {
        const listWorkspace = await getWorkspaceList(sheets, spreadsheetId);
        const result = {};

        for (const sheetName of listWorkspace) {
            if (sheetName.startsWith("DataUtama_")) {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A5:G100`,
                });

                if (response.data.values) {
                    const cleanedData = processSheetData(response.data.values);
                    Object.assign(result, cleanedData);
                } else {
                    console.error(`Tidak ada data di ${sheetName}`);
                }
            }
        }
        return result;
    }
}

function processSheetData(categoryData) {
    if (!categoryData || categoryData.length < 4) {
        throw new Error('Data dari sheet tidak lengkap');
    }

    const categoryName = categoryData[0][0].replace(/ /g, ''); // Hilangkan spasi dari nama kategori
    const type = categoryData[3][0]; // Ambil tipe dari baris pertama data (Number/Link)
    let description = '';
    const info = [];
    const accounts = [];

    categoryData.forEach((row, index) => {
        if (index === 0 || index === 1 || index === 2) return; // Skip header

        if (index === 3) {
            description = row[1] || '';
        }

        if (row[2] && row[2] !== '') {
            info.push(row[2]);
        }

        if (row[4] && row[5]) {
            accounts.push({
                name: row[4],
                [type.toLowerCase() === 'link' ? 'url' : 'number']: row[5],
                owner: row[6] || '',
            });
        }
    });

    return {
        [categoryName]: {
            type: type.toLowerCase(),
            description,
            info,
            accounts
        }
    };
}

module.exports = {
    connectSheets,
    encryptedStatus,
    passwordData,
    mainData,
};