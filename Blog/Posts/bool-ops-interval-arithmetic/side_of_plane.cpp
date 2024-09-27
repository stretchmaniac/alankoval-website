#include <array>
#include <iostream>

using vec = std::array<float, 3>;
float dot(const vec& v1, const vec& v2);
vec cross(const vec& v1, const vec& v2);
vec sub(const vec& v1, const vec& v2);

int main(){
    // Plane is {(x,y,z) : x + y - 2z = 0}
    const vec a = {1.0f, 1.0f, 1.0f};
    const vec b = {-1.0f, -1.0f, -1.0f};
    const vec c = {1.0f, -1.0f, 0.0f};

    // x + y - 2z is -2e-10 here, not zero!
    const vec x = {0.0f, 0.0f, 1e-10f};

    // d = (x - a) . ((b - a) x (c - a))
    const float d = dot(sub(x, a), cross(sub(b, a), sub(c, a)));

    // Our math says that d should not be zero, but floating point arithmetic says otherwise
    std::cout << (d == 0.0f ? "d is zero" : "d is non-zero") << std::endl;

    // Prints "d is zero"

    return 0;
}

float dot(const vec& v1, const vec& v2){
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

vec cross(const vec& v1, const vec& v2){
    return {
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
    };
}

vec sub(const vec& v1, const vec& v2){
    return {v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]};
}