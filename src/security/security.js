// Fungsi untuk memeriksa frasa rahasia di backend
function checkSecurityPhrase() {
    const secretInput = document.getElementById('secret-phrase');
    const password = secretInput.value.trim();
    const errorMessage = document.getElementById('error-message');

    fetch('/check-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.redirect; // Pindah ke main.html
            } else {
                errorMessage.style.display = 'block';
                secretInput.value = ''; // Kosongkan input
                setTimeout(() => errorMessage.style.display = 'none', 3000); // Sembunyikan pesan setelah 3 detik
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Terjadi kesalahan. Silakan coba lagi.');
        });
}

// Tambahkan event listener untuk Enter key
document.getElementById('secret-phrase').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        checkSecurityPhrase();
    }
});