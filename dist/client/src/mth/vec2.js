// Math implementations file

/***
 * Vectors
 ***/

// 3D vector class
class _vec2 {
    // Set vector
    constructor(x, y) {
        if (x == undefined) {
            (this.x = 0), (this.y = 0);
        } else if (typeof x == "object") {
            if (x.length == 2) {
                (this.x = x[0]), (this.y = x[1]);
            } else {
                (this.x = x.x), (this.y = x.y);
            }
        } else {
            if (y == undefined) {
                (this.x = x), (this.y = x);
            } else {
                (this.x = x), (this.y = y);
            }
        }
    }

    set(x, y) {
        (this.x = x), (this.y = y);
        return this;
    }

    // Add two vectors function
    add(vec) {
        return vec2(this.x + vec.x, this.y + vec.y);
    }
    // Subtract two vectors function
    sub(vec) {
        return vec2(this.x - vec.x, this.y - vec.y);
    }
    // Multiply function
    mul(v) {
        if (typeof v == "number") return vec2(this.x * v, this.y * v);
        return vec2(this.x * v.x, this.y * v.y);
    }
    // Divide function
    div(v) {
        if (typeof v == "number") {
            if (v == 0) alert("Division by zero!");
            if (v == 1) return this;
            return vec2(this.x / v, this.y / v);
        }
        return vec2(this.x / v.x, this.y / v.y);
    }
    // Two vectors dot product function
    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }
    // Get length of vector function
    length() {
        let len = this.dot(this);

        if (len == 1 || len == 0) return len;
        return Math.sqrt(len);
    }
    // Get length * length of vector function
    length2() {
        return this.dot(this);
    }
    // Normalize vector function
    normalize() {
        let len = this.dot(this);

        if (len == 1 || len == 0) return this;
        return this.div(Math.sqrt(len));
    }
    // Get array from vec2
    toArray() {
        return [this.x, this.y];
    }
}
export function vec2(...args) {
    return new _vec2(...args);
}
