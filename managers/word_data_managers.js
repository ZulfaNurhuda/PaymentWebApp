const words_data = require('../data/words_data.json');

module.exports = (max_words) => {
    let phrase = "";

    function isOnlyLetters(word) {
        const regex = /^[A-Za-z]+$/;
        return regex.test(word);
    };

    for (let i = 0; i <= max_words; i++) {
        const random_number = Math.floor(Math.random() * words_data.length);
        const random_word = words_data[random_number].kata;
        if (random_word.split(" ").length < 2 && isOnlyLetters(random_word)) {
            phrase += random_word + " ";
        };
    };

    return phrase.trim();
}