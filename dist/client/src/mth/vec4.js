// Math implementations file

/***
 * Vectors
 ***/

// 4D vector class
class _vec4 {
    // Set vector
    constructor(x, y, z, w) {
        if (x == undefined) {
            (this.x = 0), (this.y = 0), (this.z = 0), (this.w = 0);
        } else if (typeof x == "object") {
            if (x.length == 4) {
                (this.x = x[0]),
                    (this.y = x[1]),
                    (this.z = x[2]),
                    (this.w = x[3]);
            } else {
                (this.x = x.x), (this.y = x.y), (this.z = x.z), (this.w = x.w);
            }
        } else {
            if (y == undefined && z == undefined && w == undefined) {
                (this.x = x), (this.y = x), (this.z = x), (this.w = x);
            } else {
                (this.x = x), (this.y = y), (this.z = z), (this.w = w);
            }
        }
    }

    set(x, y, z, w) {
        (this.x = x), (this.y = y), (this.z = z), (this.w = w);
        return this;
    }

    // Add two vectors function
    add(vec) {
        return vec4(
            this.x + vec.x,
            this.y + vec.y,
            this.z + vec.z,
            this.w + vec.w
        );
    }
    // Subtract two vectors function
    sub(vec) {
        return vec4(
            this.x - vec.x,
            this.y - vec.y,
            this.z - vec.z,
            this.w - vec.w
        );
    }
    // Multiply function
    mul(v) {
        if (typeof v == "number")
            return vec4(this.x * v, this.y * v, this.z * v, this.w * v);
        return vec3(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
    }
    // Divide function
    div(v) {
        if (typeof v == "number") {
            if (v == 0) alert("Division by zero!");
            if (v == 1) return this;
            return vec4(this.x / v, this.y / v, this.z / v, this.w / v);
        }
        return vec4(this.x / v.x, this.y / v.y, this.z / v.z, this.w / v.w);
    }
    // Two vectors dot product function
    dot(vec) {
        return (
            this.x * vec.x + this.y * vec.y + this.z * vec.z + this.w * vec.w
        );
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
    // Get array from vec3
    toArray() {
        return [this.x, this.y, this.z, this.w];
    }
}
export function vec4(...args) {
    return new _vec4(...args);
}

// export function vec2(...args) {
//     return new _vec3(...args);
// }

// export function vec4(...args) {
//     return new _vec3(...args);
// }
