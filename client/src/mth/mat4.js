// Math implementations file

// Degrees to radians conversion
export function D2R(a) {
  return a * (Math.PI / 180.0);
}
// Radians to degrees conversion
export function R2D(a) {
  return a * (180.0 / Math.PI);
}

/***
 * Matrices
 ***/

class _mat4 {
  constructor(m = null) {
    if (m == null)
      this.m = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ];
    else if (typeof m == "object" && m.length == 4) {
      this.m = m;
    } else {
      this.m = m.m;
    }
  }

  mul(m) {
    let matr;

    if (m.length == 4) matr = m;
    else matr = m.m;

    this.m = [
      [
        this.m[0][0] * matr[0][0] +
          this.m[0][1] * matr[1][0] +
          this.m[0][2] * matr[2][0] +
          this.m[0][3] * matr[3][0],
        this.m[0][0] * matr[0][1] +
          this.m[0][1] * matr[1][1] +
          this.m[0][2] * matr[2][1] +
          this.m[0][3] * matr[3][1],
        this.m[0][0] * matr[0][2] +
          this.m[0][1] * matr[1][2] +
          this.m[0][2] * matr[2][2] +
          this.m[0][3] * matr[3][2],
        this.m[0][0] * matr[0][3] +
          this.m[0][1] * matr[1][3] +
          this.m[0][2] * matr[2][3] +
          this.m[0][3] * matr[3][3],
      ],
      [
        this.m[1][0] * matr[0][0] +
          this.m[1][1] * matr[1][0] +
          this.m[1][2] * matr[2][0] +
          this.m[1][3] * matr[3][0],
        this.m[1][0] * matr[0][1] +
          this.m[1][1] * matr[1][1] +
          this.m[1][2] * matr[2][1] +
          this.m[1][3] * matr[3][1],
        this.m[1][0] * matr[0][2] +
          this.m[1][1] * matr[1][2] +
          this.m[1][2] * matr[2][2] +
          this.m[1][3] * matr[3][2],
        this.m[1][0] * matr[0][3] +
          this.m[1][1] * matr[1][3] +
          this.m[1][2] * matr[2][3] +
          this.m[1][3] * matr[3][3],
      ],
      [
        this.m[2][0] * matr[0][0] +
          this.m[2][1] * matr[1][0] +
          this.m[2][2] * matr[2][0] +
          this.m[2][3] * matr[3][0],
        this.m[2][0] * matr[0][1] +
          this.m[2][1] * matr[1][1] +
          this.m[2][2] * matr[2][1] +
          this.m[2][3] * matr[3][1],
        this.m[2][0] * matr[0][2] +
          this.m[2][1] * matr[1][2] +
          this.m[2][2] * matr[2][2] +
          this.m[2][3] * matr[3][2],
        this.m[2][0] * matr[0][3] +
          this.m[2][1] * matr[1][3] +
          this.m[2][2] * matr[2][3] +
          this.m[2][3] * matr[3][3],
      ],
      [
        this.m[3][0] * matr[0][0] +
          this.m[3][1] * matr[1][0] +
          this.m[3][2] * matr[2][0] +
          this.m[3][3] * matr[3][0],
        this.m[3][0] * matr[0][1] +
          this.m[3][1] * matr[1][1] +
          this.m[3][2] * matr[2][1] +
          this.m[3][3] * matr[3][1],
        this.m[3][0] * matr[0][2] +
          this.m[3][1] * matr[1][2] +
          this.m[3][2] * matr[2][2] +
          this.m[3][3] * matr[3][2],
        this.m[3][0] * matr[0][3] +
          this.m[3][1] * matr[1][3] +
          this.m[3][2] * matr[2][3] +
          this.m[3][3] * matr[3][3],
      ],
    ];
    return this;
  }

  // Set translate matrix
  setTranslate(dx, dy, dz) {
    if (typeof dx == "object") {
      this.m = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [dx.x, dx.y, dx.z, 1],
      ];
      return this;
    }
    if (dy == undefined && dz == undefined) {
      this.m = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [dx, dx, dx, 1],
      ];
      return this;
    }
    this.m = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [dx, dy, dz, 1],
    ];
    return this;
  }

  // Translate matrix
  translate(dx, dy, dz) {
    if (typeof dx == "object") {
      this.mul([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [dx.x, dx.y, dx.z, 1],
      ]);
      return this;
    }
    if (dy == undefined && dz == undefined) {
      this.mul([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [dx, dx, dx, 1],
      ]);
      return this;
    }
    this.mul([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [dx, dy, dz, 1],
    ]);
    return this;
  }

  // Matrix determinator 3x3
  determ3x3(a11, a12, a13, a21, a22, a23, a31, a32, a33) {
    return (
      a11 * a22 * a33 -
      a11 * a23 * a32 -
      a12 * a21 * a33 +
      a12 * a23 * a31 +
      a13 * a21 * a32 -
      a13 * a22 * a31
    );
  }

  // Matrix determinator 4x4
  determ() {
    let det =
      this.m[0][0] *
        this.determ3x3(
          this.m[1][1],
          this.m[1][2],
          this.m[1][3],
          this.m[2][1],
          this.m[2][2],
          this.m[2][3],
          this.m[3][1],
          this.m[3][2],
          this.m[3][3]
        ) -
      this.m[0][1] *
        this.determ3x3(
          this.m[1][0],
          this.m[1][2],
          this.m[1][3],
          this.m[2][0],
          this.m[2][2],
          this.m[2][3],
          this.m[3][0],
          this.m[3][2],
          this.m[3][3]
        ) +
      this.m[0][2] *
        this.determ3x3(
          this.m[1][0],
          this.m[1][1],
          this.m[1][3],
          this.m[2][0],
          this.m[2][1],
          this.m[2][3],
          this.m[3][0],
          this.m[3][1],
          this.m[3][3]
        ) -
      this.m[0][3] *
        this.determ3x3(
          this.m[1][0],
          this.m[1][1],
          this.m[1][2],
          this.m[2][0],
          this.m[2][1],
          this.m[2][2],
          this.m[3][0],
          this.m[3][1],
          this.m[3][2]
        );

    return det;
  } // End of 'determ' function

  inverse() {
    let r = [[], [], [], []];
    let det = this.determ();

    if (det == 0) {
      let m = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ];

      return mat4(m);
    }

    /* Build adjoint matrix */
    r[0][0] =
      this.determ3x3(
        this.m[1][1],
        this.m[1][2],
        this.m[1][3],
        this.m[2][1],
        this.m[2][2],
        this.m[2][3],
        this.m[3][1],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[1][0] =
      -this.determ3x3(
        this.m[1][0],
        this.m[1][2],
        this.m[1][3],
        this.m[2][0],
        this.m[2][2],
        this.m[2][3],
        this.m[3][0],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[2][0] =
      this.determ3x3(
        this.m[1][0],
        this.m[1][1],
        this.m[1][3],
        this.m[2][0],
        this.m[2][1],
        this.m[2][3],
        this.m[3][0],
        this.m[3][1],
        this.m[3][3]
      ) / det;
    r[3][0] =
      -this.determ3x3(
        this.m[1][0],
        this.m[1][1],
        this.m[1][2],
        this.m[2][0],
        this.m[2][1],
        this.m[2][2],
        this.m[3][0],
        this.m[3][1],
        this.m[3][2]
      ) / det;

    r[0][1] =
      -this.determ3x3(
        this.m[0][1],
        this.m[0][2],
        this.m[0][3],
        this.m[2][1],
        this.m[2][2],
        this.m[2][3],
        this.m[3][1],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[1][1] =
      this.determ3x3(
        this.m[0][0],
        this.m[0][2],
        this.m[0][3],
        this.m[2][0],
        this.m[2][2],
        this.m[2][3],
        this.m[3][0],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[2][1] =
      -this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][3],
        this.m[2][0],
        this.m[2][1],
        this.m[2][3],
        this.m[3][0],
        this.m[3][1],
        this.m[3][3]
      ) / det;
    r[3][1] =
      this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][2],
        this.m[2][0],
        this.m[2][1],
        this.m[2][2],
        this.m[3][0],
        this.m[3][1],
        this.m[3][2]
      ) / det;

    r[0][2] =
      this.determ3x3(
        this.m[0][1],
        this.m[0][2],
        this.m[0][3],
        this.m[1][1],
        this.m[1][2],
        this.m[1][3],
        this.m[3][1],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[1][2] =
      -this.determ3x3(
        this.m[0][0],
        this.m[0][2],
        this.m[0][3],
        this.m[1][0],
        this.m[1][2],
        this.m[1][3],
        this.m[3][0],
        this.m[3][2],
        this.m[3][3]
      ) / det;
    r[2][2] =
      this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][3],
        this.m[1][0],
        this.m[1][1],
        this.m[1][3],
        this.m[3][0],
        this.m[3][1],
        this.m[3][3]
      ) / det;
    r[3][2] =
      -this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][2],
        this.m[1][0],
        this.m[1][1],
        this.m[1][2],
        this.m[3][0],
        this.m[3][1],
        this.m[3][2]
      ) / det;

    r[0][3] =
      -this.determ3x3(
        this.m[0][1],
        this.m[0][2],
        this.m[0][3],
        this.m[1][1],
        this.m[1][2],
        this.m[1][3],
        this.m[2][1],
        this.m[2][2],
        this.m[2][3]
      ) / det;

    r[1][3] =
      this.determ3x3(
        this.m[0][0],
        this.m[0][2],
        this.m[0][3],
        this.m[1][0],
        this.m[1][2],
        this.m[1][3],
        this.m[2][0],
        this.m[2][2],
        this.m[2][3]
      ) / det;
    r[2][3] =
      -this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][3],
        this.m[1][0],
        this.m[1][1],
        this.m[1][3],
        this.m[2][0],
        this.m[2][1],
        this.m[2][3]
      ) / det;
    r[3][3] =
      this.determ3x3(
        this.m[0][0],
        this.m[0][1],
        this.m[0][2],
        this.m[1][0],
        this.m[1][1],
        this.m[1][2],
        this.m[2][0],
        this.m[2][1],
        this.m[2][2]
      ) / det;
    this.m = r;
    return this;
  } // End of 'inverse' function

  // Transposed matrix
  transpose() {
    let r = [[], [], [], []];

    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) r[i][j] = this.m[j][i];
    return mat4(r);
  } // End of 'transpose' function

  // RotateX matrix
  rotateX(angleDeg) {
    const si = Math.sin(D2R(angleDeg));
    const co = Math.cos(D2R(angleDeg));
    const mr = [
      [1, 0, 0, 0],
      [0, co, si, 0],
      [0, -si, co, 0],
      [0, 0, 0, 1],
    ];

    return this.mul(mr);
  }

  // RotateY matrix
  rotateY(angleDeg) {
    const si = Math.sin(D2R(angleDeg));
    const co = Math.cos(D2R(angleDeg));
    const mr = [
      [co, 0, -si, 0],
      [0, 1, 0, 0],
      [si, 0, co, 0],
      [0, 0, 0, 1],
    ];

    return this.mul(mr);
  }

  // RotateZ matrix
  rotateZ(angleDeg) {
    const si = Math.sin(D2R(angleDeg));
    const co = Math.cos(D2R(angleDeg));
    const mr = [
      [co, si, 0, 0],
      [-si, co, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    return this.mul(mr);
  }

  setRotate(AngleInDegree, R) {
    let a = AngleInDegree * Math.PI,
      sine = Math.sin(a),
      cosine = Math.cos(a);
    let x = 0,
      y = 0,
      z = 1;
    if (typeof R == "object")
      if (R.length == 3) (x = R[0]), (y = R[1]), (z = R[2]);
      else (x = R.x), (y = R.y), (z = R.z);
    // Vector normalize
    let len = x * x + y * y + z * z;
    if (len != 0 && len != 1)
      (len = Math.sqrt(len)), (x /= len), (y /= len), (z /= len);
    this.m[0][0] = cosine + x * x * (1 - cosine);
    this.m[0][1] = x * y * (1 - cosine) + z * sine;
    this.m[0][2] = x * z * (1 - cosine) - y * sine;
    this.m[0][3] = 0;
    this.m[1][0] = y * x * (1 - cosine) - z * sine;
    this.m[1][1] = cosine + y * y * (1 - cosine);
    this.m[1][2] = y * z * (1 - cosine) + x * sine;
    this.m[1][3] = 0;
    this.m[2][0] = z * x * (1 - cosine) + y * sine;
    this.m[2][1] = z * y * (1 - cosine) - x * sine;
    this.m[2][2] = cosine + z * z * (1 - cosine);
    this.m[2][3] = 0;
    this.m[3][0] = 0;
    this.m[3][1] = 0;
    this.m[3][2] = 0;
    this.m[3][3] = 1;
    return this;
  } // End of 'setRotate' function

  rotate(AngleInDegree, R) {
    return this.mul(mat4().setRotate(AngleInDegree, R));
  } // End of 'rotate' function

  setView(Loc, At, Up1) {
    let Dir = At.sub(Loc).normalize(),
      Right = Dir.cross(Up1).normalize(),
      Up = Right.cross(Dir).normalize();
    this.m = [
      [Right.x, Up.x, -Dir.x, 0],
      [Right.y, Up.y, -Dir.y, 0],
      [Right.z, Up.z, -Dir.z, 0],
      [-Loc.dot(Right), -Loc.dot(Up), Loc.dot(Dir), 1],
    ];
    return this;
  } // End of 'setView' function

  setOrtho(Left, Right, Bottom, Top, Near, Far) {
    this.m = [
      [2 / (Right - Left), 0, 0, 0],
      [0, 2 / (Top - Bottom), 0, 0],
      [0, 0, -2 / (Far - Near), 0],
      [
        -(Right + Left) / (Right - Left),
        -(Top + Bottom) / (Top - Bottom),
        -(Far + Near) / (Far - Near),
        1,
      ],
    ];
    return this;
  } // End of 'setOrtho' function

  setFrustum(Left, Right, Bottom, Top, Near, Far) {
    this.m = [
      [(2 * Near) / (Right - Left), 0, 0, 0],
      [0, (2 * Near) / (Top - Bottom), 0, 0],
      [
        (Right + Left) / (Right - Left),
        (Top + Bottom) / (Top - Bottom),
        -(Far + Near) / (Far - Near),
        -1,
      ],
      [0, 0, (-2 * Near * Far) / (Far - Near), 0],
    ];
    return this;
  } // End of 'setFrustum' function

  view(Loc, At, Up1) {
    return this.mul(mat4().setView(Loc, At, Up1));
  } // End of 'view' function

  ortho(Left, Right, Bottom, Top, Near, Far) {
    return this.mul(mat4().setOrtho(Left, Right, Bottom, Top, Near, Far));
  } // End of 'ortho' function

  frustum(Left, Right, Bottom, Top, Near, Far) {
    return this.mul(mat4().setFrustum(Left, Right, Bottom, Top, Near, Far));
  } // End if 'frustum' function

  toArray() {
    return [].concat(...this.m);
  } // End of 'toArray' function

  mul2(m1, m2) {
    return mat4(m1).mul(m2);
  } // End of 'mul2' function
}

export function mat4(...args) {
  return new _mat4(...args);
}
