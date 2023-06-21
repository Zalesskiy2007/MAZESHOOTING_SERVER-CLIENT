// Math implementations file

/***
 * Vectors
 ***/

// 3D vector class
class _vec3 {
    // Set vector
    constructor(x, y, z) {
        if (x == undefined) {
            (this.x = 0), (this.y = 0), (this.z = 0);
        } else if (typeof x == "object") {
            if (x.length == 3) {
                (this.x = x[0]), (this.y = x[1]), (this.z = x[2]);
            } else {
                (this.x = x.x), (this.y = x.y), (this.z = x.z);
            }
        } else {
            if (y == undefined && z == undefined) {
                (this.x = x), (this.y = x), (this.z = x);
            } else {
                (this.x = x), (this.y = y), (this.z = z);
            }
        }
    }

    set(x, y, z) {
        (this.x = x), (this.y = y), (this.z = z);
        return this;
    }

    // Add two vectors function
    add(vec) {
        return vec3(this.x + vec.x, this.y + vec.y, this.z + vec.z);
    }
    // Subtract two vectors function
    sub(vec) {
        return vec3(this.x - vec.x, this.y - vec.y, this.z - vec.z);
    }
    // Multiply function
    mul(v) {
        if (typeof v == "number")
            return vec3(this.x * v, this.y * v, this.z * v);
        return vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }
    // Divide function
    div(v) {
        if (typeof v == "number") {
            if (v == 0) alert("Division by zero!");
            if (v == 1) return this;
            return vec3(this.x / v, this.y / v, this.z / v);
        }
        return vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }
    // Negate vectir function
    neg() {
        return vec3(-this.x, -this.y, -this.z);
    }
    // Two vectors dot product function
    dot(vec) {
        return this.x * vec.x + this.y * vec.y + this.z * vec.z;
    }
    // Two vectors cross product function
    cross(vec) {
        return vec3(
            this.y * vec.z - this.z * vec.y,
            this.z * vec.x - this.x * vec.z,
            this.x * vec.y - this.y * vec.x
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
        return [this.x, this.y, this.z];
    }
    // Transform point of vector function
    pointTransform(mat) {
        return vec3(
            this.x * mat.m[0][0] +
                this.y * mat.m[1][0] +
                this.z * mat.m[2][0] +
                mat.m[3][0],
            this.x * mat.m[0][1] +
                this.y * mat.m[1][1] +
                this.z * mat.m[2][1] +
                mat.m[3][1],
            this.x * mat.m[0][2] +
                this.y * mat.m[1][2] +
                this.z * mat.m[2][2] +
                mat.m[3][2]
        );
    }
    // Vector transform function
    transform(mat) {
        return vec3(
            this.x * mat.m[0][0] + this.y * mat.m[1][0] + this.z * mat.m[2][0],
            this.x * mat.m[0][1] + this.y * mat.m[1][1] + this.z * mat.m[2][1],
            this.x * mat.m[0][2] + this.y * mat.m[1][2] + this.z * mat.m[2][2]
        );
    }
    // Vector by matrix multiplication function
    mulMatr(mat) {
        let w =
            this.x * mat.m[0][3] +
            this.y * mat.m[1][3] +
            this.z * mat.m[2][3] +
            mat.m[3][3];

        return vec3(
            (this.x * mat.m[0][0] +
                this.y * mat.m[1][0] +
                this.z * mat.m[2][0] +
                mat.m[3][0]) /
                w,
            (this.x * mat.m[0][1] +
                this.y * mat.m[1][1] +
                this.z * mat.m[2][1] +
                mat.m[3][1]) /
                w,
            (this.x * mat.m[0][2] +
                this.y * mat.m[1][2] +
                this.z * mat.m[2][2] +
                mat.m[3][2]) /
                w
        );
    }
}
export function vec3(...args) {
    return new _vec3(...args);
}
