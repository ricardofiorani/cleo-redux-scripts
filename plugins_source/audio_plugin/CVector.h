#pragma once
#include <cmath>

struct CVector {
    float x, y, z;

    CVector() : x(0.0f), y(0.0f), z(0.0f) {}
    CVector(float _x, float _y, float _z) : x(_x), y(_y), z(_z) {}

    CVector operator+(const CVector& other) const {
        return CVector(x + other.x, y + other.y, z + other.z);
    }

    CVector operator-(const CVector& other) const {
        return CVector(x - other.x, y - other.y, z - other.z);
    }

    CVector operator*(float scalar) const {
        return CVector(x * scalar, y * scalar, z * scalar);
    }

    CVector operator/(float scalar) const {
        if (scalar != 0.0f) {
            return CVector(x / scalar, y / scalar, z / scalar);
        }
        return CVector(0.0f, 0.0f, 0.0f);
    }

    CVector& operator/=(float scalar) {
        if (scalar != 0.0f) {
            x /= scalar;
            y /= scalar;
            z /= scalar;
        }
        return *this;
    }

    CVector& operator+=(const CVector& other) {
        x += other.x;
        y += other.y;
        z += other.z;
        return *this;
    }

    CVector& operator-=(const CVector& other) {
        x -= other.x;
        y -= other.y;
        z -= other.z;
        return *this;
    }

    float Magnitude() const {
        return sqrtf(x * x + y * y + z * z);
    }

    float NormaliseAndMag() {
        float mag = Magnitude();
        if (mag > 0.0f) {
            x /= mag;
            y /= mag;
            z /= mag;
        }
        return mag;
    }
};

inline float DotProduct(const CVector& a, const CVector& b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline float Lerp(float a, float b, float t) {
    return a * (1.0f - t) + b * t;
}

inline CVector Lerp(const CVector& a, const CVector& b, float t) {
    return a * (1.0f - t) + b * t;
}
