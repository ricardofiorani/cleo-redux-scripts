#pragma once
#include <algorithm>

class CInterpolatedValue {
public:
    CInterpolatedValue(float value = 0.0f) {
        currValue = value;
        targetValue = value;
        step = 0.0f;
    }

    float value() const { return currValue; }

    void setValue(float target, float transitionTime = 0.0f) {
        targetValue = target;

        if (transitionTime <= 0.0f) {
            currValue = target;
            return;
        }

        step = (targetValue - currValue) / transitionTime;
    }

    void update(float elapsedTime) {
        if (currValue == targetValue) {
            return;
        }

        currValue += step * elapsedTime;

        auto remaining = targetValue - currValue;
        remaining *= (step > 0.0f) ? 1.0f : -1.0f;
        if (remaining <= 0.0f) {
            currValue = targetValue;
        }
    }

    void finish() { currValue = targetValue; }

private:
    float currValue = 0.0f;
    float targetValue = 0.0f;
    float step = 0.0f;
};
