"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import "./backgroundImageCycle.css";
import { useTheme } from "../context/ThemeContext";

const BackgroundImageCycle: React.FC = () => {
    const { darkMode } = useTheme();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const images = useMemo(
        () =>
            darkMode
                ? [
                    "/images/dark/background/background1.jpg",
                    "/images/dark/background/background2.jpg",
                    "/images/dark/background/background3.jpg",
                ]
                : [
                    "/images/light/background/background1.jpg",
                    "/images/light/background/background2.jpg",
                    "/images/light/background/background3.jpg",
                ],
        [darkMode]
    );
    const fadeDuration = 1500;
    const cycleInterval = 30000;
    const [baseIndex, setBaseIndex] = useState(0);
    const [overlayIndex, setOverlayIndex] = useState(1);
    const [fadeOverlay, setFadeOverlay] = useState(false);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setBaseIndex(0);
        setOverlayIndex(1);
        setFadeOverlay(false);
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, [darkMode, images]);

    useEffect(() => {
        if (images.length < 2) return;
        const cleanup = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        const performTransition = () => {
            setFadeOverlay(true);
            timeoutRef.current = setTimeout(() => {
                setBaseIndex(overlayIndex);
                setFadeOverlay(false);
            }, fadeDuration);
            timeoutRef.current = setTimeout(() => {
                const nextOverlayIndex = (overlayIndex + 1) % images.length;
                setOverlayIndex(nextOverlayIndex);
            }, fadeDuration * 2);
        };
        intervalRef.current = setInterval(performTransition, cycleInterval);
        return cleanup;
    }, [images, fadeDuration, cycleInterval, overlayIndex]);

    return (
        <div className="backgroundImageContainer">
            <div
                className="baseBackground"
                style={{ backgroundImage: `url(${images[baseIndex]})` }}
            ></div>
            <div
                className={`overlayBackground ${fadeOverlay ? "visible" : ""}`}
                style={{
                    backgroundImage: `url(${images[overlayIndex]})`,
                    transitionDuration: `${fadeDuration}ms`,
                }}
            ></div>
        </div>
    );
};

export default BackgroundImageCycle;