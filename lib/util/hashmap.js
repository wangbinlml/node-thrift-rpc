function Hashmap() {

}

module.exports = Hashmap;
/**
 * Set
 */
Hashmap.prototype.set = function (key, value) {
    this[key] = value;
};

/**
 * Get
 */
Hashmap.prototype.get = function (key) {
    return this[key];
};

/**
 * Contains
 */
Hashmap.prototype.contains = function (key) {
    return this[key] == undefined ? false : true;
};

/**
 * Remove
 */
Hashmap.prototype.remove = function (key) {
    delete this[key];
};
