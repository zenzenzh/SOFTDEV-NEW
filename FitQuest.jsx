  import React, { useEffect, useMemo, useRef, useState } from "react";
  import AsyncStorage from '@react-native-async-storage/async-storage';
  // ─── Local Progress Helpers ────────────────────────────────────────────────

  const PROGRESS_KEY = 'fitquest-progress';

  // Save progress object to device
  async function saveLocalProgress(progress) {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      // Optionally handle error
      console.warn('Failed to save progress', e);
    }
  }

  // Load progress object from device
  async function loadLocalProgress() {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      // Optionally handle error
      console.warn('Failed to load progress', e);
      return null;
    }
  }
  import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    PanResponder,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
    Modal,
  } from "react-native";
  import { Asset } from "expo-asset";
  // expo-av Video used only on native; on web we fall back to HTML5 video via ExerciseMedia
  let NativeVideo = null;
  try { NativeVideo = require("expo-av").Video; } catch (_) {}
  import * as Speech from "expo-speech";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const GENDER_OPTIONS = ["Male", "Female", "Other"];

  const GOAL_OPTIONS = [
    { id: "lose", label: "Lose Weight", subtitle: "Cut body fat and improve conditioning" },
    { id: "gain", label: "Gain Muscle", subtitle: "Build strength and lean mass" },
    { id: "maintain", label: "Maintain Health", subtitle: "Stay active and consistent" },
  ];

  const KNOWLEDGE_LEVELS = [
    { id: "beginner", label: "Beginner" },
    { id: "intermediate", label: "Intermediate" },
    { id: "advanced", label: "Advanced" },
  ];

  const WORKOUT_TYPES = [
    {
      id: "cardio",
      label: "Cardio",
      subtitle: "Steady movement focused on endurance",
      iconUri: require("./assets/cardio.png"),
    },
    {
      id: "weightlifting",
      label: "Weightlifting",
      subtitle: "Strength-focused sets for muscle and power",
      iconUri: require("./assets/weightlifting.png"),
    },
  ];

  const DASHBOARD_BG_SOURCE = require("./assets/gym-bg.png");
  const DAY_SELECT_BG_SOURCE = require("./assets/dates-bg.png");
  const WORKOUT_BG_SOURCE = require("./assets/workout-bg.png");

  const EXERCISES = [
    {
      id: "jumping-jacks",
      name: "Jumping Jacks",
      type: "cardio",
      durationSec: 30,
      caloriesPerMinute: 9,
      mediaSource: require("./assets/workouts/cardio/jumpingjacks-alpha.webm"),
      fallbackSource: require("./assets/workouts/cardio/jumpingjacks.mp4"),
      description: "Jump feet out while raising arms overhead, then return to start.",
    },
    {
      id: "high-knees",
      name: "High Knees",
      type: "cardio",
      durationSec: 35,
      caloriesPerMinute: 11,
      mediaSource: require("./assets/workouts/cardio/highknees.mp4"),
      fallbackSource: require("./assets/workouts/cardio/highknees.mp4"),
      description: "Run in place and lift knees toward your chest quickly.",
    },
    {
      id: "squats",
      name: "Squats",
      type: "cardio",
      durationSec: 40,
      caloriesPerMinute: 10,
      mediaSource: require("./assets/workouts/cardio/squats-alpha.webm"),
      fallbackSource: require("./assets/workouts/cardio/squats.mp4"),
      description: "Lower hips with control, keep chest up, then drive back to standing.",
    },
    {
      id: "push-ups",
      name: "Push-Ups",
      type: "cardio",
      durationSec: 35,
      caloriesPerMinute: 10,
      mediaSource: require("./assets/workouts/cardio/pushup-alpha.webm"),
      fallbackSource: require("./assets/workouts/cardio/pushup.mp4"),
      description: "Lower your chest with control, then press back up to full extension.",
    },
    {
      id: "mountain-climbers",
      name: "Mountain Climbers",
      type: "cardio",
      durationSec: 35,
      caloriesPerMinute: 10,
      mediaSource: require("./assets/workouts/cardio/mountainclimb-alpha.webm"),
      fallbackSource: require("./assets/workouts/cardio/mountainclimb.mp4"),
      description: "From plank, drive knees forward in a quick alternating rhythm.",
    },
    {
      id: "jump-rope",
      name: "Jump Rope",
      type: "cardio",
      durationSec: 45,
      caloriesPerMinute: 12,
      mediaSource: require("./assets/workouts/cardio/jumprope-alpha.webm"),
      fallbackSource: require("./assets/workouts/cardio/jumprope.mp4"),
      description: "Stay light on your feet and maintain a steady skipping pace.",
    },
    {
      id: "dumbbell-goblet-squat",
      name: "Goblet Squat",
      type: "weightlifting",
      durationSec: 45,
      caloriesPerMinute: 8,
      mediaSource: require("./assets/workouts/weightlifting/gobletsquat-alpha.webm"),
      fallbackSource: require("./assets/workouts/weightlifting/gobletsquat.mp4"),
      description: "Hold a weight at chest level, squat deep, and drive upward through your heels.",
    },
    {
      id: "dumbbell-press",
      name: "Dumbbell Shoulder Press",
      type: "weightlifting",
      durationSec: 40,
      caloriesPerMinute: 7,
      mediaSource: require("./assets/workouts/weightlifting/dumbshoulderpress-alpha.webm"),
      fallbackSource: require("./assets/workouts/weightlifting/dumbshoulderpress.mp4"),
      description: "Press weights overhead with control, then lower back to shoulder height.",
    },
    {
      id: "bent-over-row",
      name: "Bent-Over Row",
      type: "weightlifting",
      durationSec: 40,
      caloriesPerMinute: 7,
      mediaSource: require("./assets/workouts/weightlifting/bentoverrow-alpha.webm"),
      fallbackSource: require("./assets/workouts/weightlifting/bentoverrow.mp4"),
      description: "Hinge at the hips and pull weights toward your torso while keeping your back flat.",
    },
    {
      id: "romanian-deadlift",
      name: "Romanian Deadlift",
      type: "weightlifting",
      durationSec: 45,
      caloriesPerMinute: 8,
      mediaSource: require("./assets/workouts/weightlifting/romaniandeadlift-alpha.webm"),
      fallbackSource: require("./assets/workouts/weightlifting/romaniandeadlift.mp4"),
      description: "Lower weights along your legs with a hip hinge, then stand tall by driving hips forward.",
    },
  ];

  const SHOP_ITEMS = [
    // ── Consumables ──
    { id: "skip_token",     name: "Quiz Skip Token",     price: 150,  type: "consumable", emoji: "⏭️", description: "Skip any one IT question — no penalty." },
    { id: "xp_bomb",        name: "XP Bomb",              price: 300,  type: "consumable", emoji: "💥", description: "Instantly earn +200 bonus XP." },
    { id: "hint_token",     name: "Hint Token",            price: 200,  type: "consumable", emoji: "🧠", description: "Reveals one wrong answer per quiz question." },
    { id: "streak_freeze",  name: "Streak Freeze",         price: 700,  type: "consumable", emoji: "🧊", description: "Protects your streak for 2 missed days." },
    { id: "double_xp",      name: "Double XP Pass",        price: 500,  type: "consumable", emoji: "⚡", description: "Double all XP earned in your next session." },
    { id: "calorie_boost",  name: "Calorie Boost",         price: 250,  type: "consumable", emoji: "🔥", description: "+50% calorie calculation for one session." },
    { id: "rest_pass",      name: "Rest Day Pass",         price: 400,  type: "consumable", emoji: "😴", description: "Skip a day without breaking your streak." },
    { id: "mega_xp",        name: "Mega XP Bomb",          price: 800,  type: "consumable", emoji: "💣", description: "Instantly earn +500 bonus XP." },
    { id: "quiz_shield",    name: "Quiz Shield",           price: 350,  type: "consumable", emoji: "🛡️", description: "Wrong answers don't count once per session." },
    { id: "time_boost",     name: "Speed Token",           price: 180,  type: "consumable", emoji: "⏱️", description: "Reduce exercise timer by 5s each." },

    // ── Skins / Themes ──
    { id: "neon_aura",      name: "Neon Aura",             price: 500,  type: "skin", emoji: "💙", color: "#00f2ff", description: "Electric blue UI accents." },
    { id: "gold_aura",      name: "Gold Aura",              price: 1000, type: "skin", emoji: "🥇", color: "#ffd700", description: "Legendary golden UI accents." },
    { id: "fire_aura",      name: "Fire Aura",              price: 800,  type: "skin", emoji: "🔥", color: "#ff5722", description: "Blazing red-orange UI accents." },
    { id: "emerald_aura",   name: "Emerald Aura",           price: 600,  type: "skin", emoji: "💚", color: "#10b981", description: "Fresh green UI accents." },
    { id: "sakura_aura",    name: "Sakura Aura",            price: 750,  type: "skin", emoji: "🌸", color: "#f9a8d4", description: "Soft pink cherry blossom theme." },
    { id: "galaxy_aura",    name: "Galaxy Aura",            price: 1200, type: "skin", emoji: "🌌", color: "#818cf8", description: "Deep space indigo theme." },
    { id: "shadow_aura",    name: "Shadow Aura",            price: 900,  type: "skin", emoji: "🖤", color: "#475569", description: "Stealth dark theme." },

    // ── XP Boosters (permanent) ──
    { id: "xp_chip_s",     name: "XP Chip I",              price: 400,  type: "stat_boost", emoji: "⭐", stat: "xpBoost", value: 0.1,  description: "+10% XP gain on all sessions." },
    { id: "xp_chip_m",     name: "XP Chip II",             price: 900,  type: "stat_boost", emoji: "🌟", stat: "xpBoost", value: 0.15, description: "+15% XP gain stacked on Chip I." },
    { id: "xp_chip_l",     name: "XP Chip III",            price: 1500, type: "stat_boost", emoji: "💫", stat: "xpBoost", value: 0.20, description: "+20% XP gain, the ultimate boost." },
    { id: "cal_chip",      name: "Calorie Amp",             price: 350,  type: "stat_boost", emoji: "🔥", stat: "calBoost", value: 0.15, description: "+15% calorie calculation boost." },
    { id: "cal_chip_ii",   name: "Calorie Amp II",          price: 750,  type: "stat_boost", emoji: "🌡️", stat: "calBoost", value: 0.25, description: "+25% calorie calculation boost." },

    // ── Special Equipment ──
    { id: "protein_shake",  name: "Protein Shake",          price: 300,  type: "consumable", emoji: "🥤", description: "+20 bonus XP per exercise in next session." },
    { id: "gym_gloves",     name: "Gym Gloves",             price: 450,  type: "stat_boost", emoji: "🧤", stat: "xpBoost", value: 0.05, description: "Grip power: +5% XP from weight exercises." },
    { id: "running_shoes",  name: "Running Shoes",          price: 450,  type: "stat_boost", emoji: "👟", stat: "calBoost", value: 0.10, description: "+10% calorie burn on cardio sessions." },
    { id: "energy_bar",     name: "Energy Bar",             price: 120,  type: "consumable", emoji: "🍫", description: "+50 flat XP, quick fuel." },
    { id: "water_bottle",   name: "Premium Water Bottle",   price: 200,  type: "stat_boost", emoji: "💧", stat: "calBoost", value: 0.05, description: "Hydration boost: +5% calorie tracking." },
  ];

  // ─── Character System Constants ───────────────────────────────────────────────
  const CHARACTER_BODIES = [
    { id: "body_default",  label: "Rookie",   skinTone: "#f5cba7", hairColor: "#5d4037", shirtColor: "#1565c0", pantsColor: "#37474f", eyeColor: "#4e342e", color: "#9b7ec8", free: true,   desc: "Just getting started" },
    { id: "body_athlete",  label: "Athlete",  skinTone: "#d4a574", hairColor: "#212121", shirtColor: "#00897b", pantsColor: "#1a237e", eyeColor: "#1b5e20", color: "#10b981", price: 300,  desc: "Built for performance" },
    { id: "body_ninja",    label: "Ninja",    skinTone: "#b0bec5", hairColor: "#000000", shirtColor: "#212121", pantsColor: "#000000", eyeColor: "#b71c1c", color: "#c084fc", price: 600,  desc: "Shadow warrior" },
    { id: "body_warrior",  label: "Warrior",  skinTone: "#8d6e63", hairColor: "#bf360c", shirtColor: "#b71c1c", pantsColor: "#4a148c", eyeColor: "#ff6f00", color: "#f97316", price: 900,  desc: "Legendary strength" },
    { id: "body_cyber",    label: "Cyber",    skinTone: "#cfd8dc", hairColor: "#00e5ff", shirtColor: "#0d47a1", pantsColor: "#1a237e", eyeColor: "#00e5ff", color: "#06d6a0", price: 1200, desc: "From the future" },
  ];

  const WARDROBE_ITEMS = [
    { id: "hat_none",    slot: "hat", label: "No Hat",      emoji: "—",  emojiLarge: "",    free: true },
    { id: "hat_cap",     slot: "hat", label: "Cap",         emoji: "🧢", emojiLarge: "🧢", price: 100 },
    { id: "hat_crown",   slot: "hat", label: "Crown",       emoji: "👑", emojiLarge: "👑", price: 500 },
    { id: "hat_helmet",  slot: "hat", label: "Helmet",      emoji: "⛑️", emojiLarge: "⛑️", price: 300 },
    { id: "hat_halo",    slot: "hat", label: "Halo",        emoji: "😇", emojiLarge: "😇", price: 700 },
    { id: "top_none",    slot: "top", label: "Basic Tee",   emoji: "👕", emojiLarge: "👕", free: true },
    { id: "top_hoodie",  slot: "top", label: "Hoodie",      emoji: "🧥", emojiLarge: "🧥", price: 200 },
    { id: "top_jersey",  slot: "top", label: "Jersey",      emoji: "🥋", emojiLarge: "🥋", price: 350 },
    { id: "top_cape",    slot: "top", label: "Cape",        emoji: "🦸", emojiLarge: "🦸", price: 800 },
    { id: "bot_none",    slot: "bot", label: "Shorts",      emoji: "🩳", emojiLarge: "🩳", free: true },
    { id: "bot_joggers", slot: "bot", label: "Joggers",     emoji: "👖", emojiLarge: "👖", price: 150 },
    { id: "bot_armor",   slot: "bot", label: "Armor",       emoji: "🦺", emojiLarge: "🦺", price: 400 },
    { id: "acc_none",    slot: "acc", label: "No Accessory",emoji: "—",  emojiLarge: "",    free: true },
    { id: "acc_glasses", slot: "acc", label: "Shades",      emoji: "🕶️", emojiLarge: "🕶️", price: 100 },
    { id: "acc_medal",   slot: "acc", label: "Medal",       emoji: "🏅", emojiLarge: "🏅", price: 250 },
    { id: "acc_wings",   slot: "acc", label: "Wings",       emoji: "🪽", emojiLarge: "🪽", price: 800 },
    { id: "acc_sword",   slot: "acc", label: "Sword",       emoji: "⚔️", emojiLarge: "⚔️", price: 600 },
  ];

  const STAT_BOOSTS = [
    { id: "boost_xp", label: "+10% XP Gain", emoji: "⭐", desc: "Earn 10% more XP per session.", price: 400, type: "stat", stat: "xpBoost", value: 0.1 },
    { id: "boost_streak", label: "Streak Shield", emoji: "🛡️", desc: "Protects your streak once if you miss a day.", price: 600, type: "stat", stat: "streakShield", value: 1 },
    { id: "boost_calories", label: "+15% Calorie Burn", emoji: "🔥", desc: "Boosts calorie calculation by 15%.", price: 350, type: "stat", stat: "calBoost", value: 0.15 },
    { id: "boost_quiz", label: "Hint Token", emoji: "🧠", desc: "Reveals one wrong answer per quiz.", price: 250, type: "consumable", stat: "hintToken", value: 1 },
  ];

  const INITIAL_CHARACTER = {
    bodyId: "body_default",
    hat: "hat_none",
    top: "top_none",
    bot: "bot_none",
    acc: "acc_none",
    ownedItems: ["body_default", "hat_none", "top_none", "bot_none", "acc_none"],
    stats: { xpBoost: 0, streakShield: 0, calBoost: 0, hintToken: 0 },
  };

  const TOPICS = {
    programming: {
      name: "Fundamentals of Programming",
      questions: [
        // ── Easy (difficulty 1) ──
        { prompt: "Which keyword creates a function in JavaScript?", options: ["func", "function", "define", "method"], correct: 1, difficulty: 1 },
        { prompt: "What does a loop help you do?", options: ["Repeat instructions", "Store only images", "Close the app", "Delete files"], correct: 0, difficulty: 1 },
        { prompt: "Which one is a valid variable name?", options: ["2name", "full-name", "userScore", "my variable"], correct: 2, difficulty: 1 },
        { prompt: "What symbol is used for single-line comments in most languages?", options: ["##", "//", "**", "!!"], correct: 1, difficulty: 1 },
        { prompt: "What is the output of 2 + 3 in most programming languages?", options: ["23", "5", "6", "Error"], correct: 1, difficulty: 1 },
        { prompt: "Which data type stores whole numbers?", options: ["String", "Boolean", "Integer", "Float"], correct: 2, difficulty: 1 },
        // ── Moderate (difficulty 2) ──
        { prompt: "What does if/else control?", options: ["Condition-based choices", "File size", "Battery level", "Screen brightness"], correct: 0, difficulty: 2 },
        { prompt: "What is a function that calls itself?", options: ["Loop", "Recursive function", "Static method", "Global variable"], correct: 1, difficulty: 2 },
        { prompt: "Which concept means keeping data and methods bundled together?", options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"], correct: 2, difficulty: 2 },
        { prompt: "What does O(n) mean in Big-O notation?", options: ["Constant time", "Linear time", "Quadratic time", "Logarithmic time"], correct: 1, difficulty: 2 },
        { prompt: "What keyword is used to handle exceptions in Java?", options: ["handle", "catch", "rescue", "except"], correct: 1, difficulty: 2 },
        { prompt: "In Python, what does len('hello') return?", options: ["4", "5", "6", "Error"], correct: 1, difficulty: 2 },
        // ── Hard (difficulty 3) ──
        { prompt: "What is a closure in JavaScript?", options: ["A function with access to its outer scope's variables", "A way to close the browser", "A type of loop", "A CSS selector"], correct: 0, difficulty: 3 },
        { prompt: "Which sorting algorithm has an average time complexity of O(n log n)?", options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Linear Search"], correct: 2, difficulty: 3 },
        { prompt: "What is the difference between stack and heap memory?", options: ["Stack is slower", "Stack is for static allocation, heap for dynamic", "Heap is always smaller", "They are the same"], correct: 1, difficulty: 3 },
        { prompt: "What design pattern separates application logic from UI?", options: ["Singleton", "Observer", "MVC", "Factory"], correct: 2, difficulty: 3 },
        // ── More Medium ──
        { prompt: "What does the 'this' keyword refer to inside a class method?", options: ["The global window object", "The current instance of the class", "The parent class", "undefined"], correct: 1, difficulty: 2 },
        { prompt: "What is the purpose of a constructor in OOP?", options: ["Delete an object", "Initialize a new object's properties", "Sort a list", "Parse JSON"], correct: 1, difficulty: 2 },
        { prompt: "What data structure uses FIFO order?", options: ["Stack", "Queue", "Tree", "Graph"], correct: 1, difficulty: 2 },
        { prompt: "In JavaScript, what does 'typeof null' return?", options: ['"null"', '"undefined"', '"object"', '"boolean"'], correct: 2, difficulty: 2 },
        // ── More Hard ──
        { prompt: "What is a memory leak in programming?", options: ["RAM getting physically hot", "Allocated memory never being freed, causing exhaustion", "A bug that crashes the OS", "A corrupted variable"], correct: 1, difficulty: 3 },
        { prompt: "What is tail call optimization?", options: ["Caching the last function call", "Reusing stack frames for tail-recursive calls", "Deleting old call stacks", "Inlining small functions"], correct: 1, difficulty: 3 },
        { prompt: "What is memoization?", options: ["Writing code from memory", "Caching function results to avoid repeat computation", "A type of recursion", "Memory allocation strategy"], correct: 1, difficulty: 3 },
      ],
    },
    hardware: {
      name: "Computer Hardware",
      questions: [
        // ── Easy (difficulty 1) ──
        { prompt: "Which component is considered the brain of the computer?", options: ["CPU", "Monitor", "Keyboard", "Mouse"], correct: 0, difficulty: 1 },
        { prompt: "What does RAM primarily provide?", options: ["Temporary working memory", "Permanent internet storage", "Cooling", "Power"], correct: 0, difficulty: 1 },
        { prompt: "Which part usually stores data long term?", options: ["GPU", "SSD or HDD", "Power cable", "USB hub"], correct: 1, difficulty: 1 },
        { prompt: "Which port is common for video output?", options: ["HDMI", "RJ11", "PS/2", "DB9"], correct: 0, difficulty: 1 },
        { prompt: "What does GPU stand for?", options: ["General Processing Unit", "Graphics Processing Unit", "Global Parallel Unit", "Grid Power Unit"], correct: 1, difficulty: 1 },
        { prompt: "What connects the CPU to RAM on a motherboard?", options: ["PCI bus", "Front-side bus / memory bus", "SATA cable", "USB controller"], correct: 1, difficulty: 1 },
        // ── Moderate (difficulty 2) ──
        { prompt: "What is the function of a heatsink?", options: ["Boost clock speed", "Dissipate heat from the CPU", "Increase RAM speed", "Store data"], correct: 1, difficulty: 2 },
        { prompt: "What does BIOS stand for?", options: ["Basic Input/Output System", "Binary Integrated Operating System", "Boot Input/Output Sequence", "Base Instruction Output Set"], correct: 0, difficulty: 2 },
        { prompt: "Which storage interface is fastest for modern SSDs?", options: ["SATA III", "IDE", "NVMe PCIe", "USB 2.0"], correct: 2, difficulty: 2 },
        { prompt: "What is the purpose of a power supply unit (PSU)?", options: ["Store programs", "Convert AC to DC for components", "Control the CPU", "Cool the GPU"], correct: 1, difficulty: 2 },
        { prompt: "How many bits are in 2 bytes?", options: ["8", "12", "16", "32"], correct: 2, difficulty: 2 },
        { prompt: "What does 'overclocking' a CPU mean?", options: ["Reducing clock speed to save power", "Running the CPU above its rated speed", "Replacing the CPU cooler", "Disabling a CPU core"], correct: 1, difficulty: 2 },
        // ── Hard (difficulty 3) ──
        { prompt: "What is cache coherency in multi-core CPUs?", options: ["Ensuring all cores see a consistent view of memory", "Reducing cache size", "Disabling L3 cache", "Syncing GPU and CPU clocks"], correct: 0, difficulty: 3 },
        { prompt: "What is the primary advantage of ECC RAM?", options: ["It is twice as fast", "It detects and corrects single-bit memory errors", "It uses less power", "It is cheaper"], correct: 1, difficulty: 3 },
        { prompt: "What does RAID 5 require at minimum?", options: ["2 drives", "3 drives", "4 drives", "6 drives"], correct: 1, difficulty: 3 },
        { prompt: "What is the Von Neumann bottleneck?", options: ["The GPU being slower than the CPU", "The speed gap between CPU and memory causing idle wait", "The power limit of a CPU", "The limit of PCIe lanes"], correct: 1, difficulty: 3 },
        // ── More Medium ──
        { prompt: "What is thermal throttling?", options: ["Increasing fan speed", "CPU slowing itself down to prevent heat damage", "Overclocking during gaming", "A GPU benchmark mode"], correct: 1, difficulty: 2 },
        { prompt: "Which PCIe slot version doubles the bandwidth of the previous?", options: ["PCIe 1.0 to 1.1", "Each major version doubles bandwidth per lane", "PCIe 3.0 to 3.1", "Only GPU slots are faster"], correct: 1, difficulty: 2 },
        // ── More Hard ──
        { prompt: "What is branch prediction in a CPU pipeline?", options: ["Guessing future instruction paths to reduce stalls", "A cache strategy", "Sorting branches in code", "A RAM timing optimization"], correct: 0, difficulty: 3 },
        { prompt: "What does the chipset on a motherboard do?", options: ["Run the OS", "Manage communication between CPU, RAM, and peripherals", "Store BIOS only", "Control only USB ports"], correct: 1, difficulty: 3 },
      ],
    },
    database: {
      name: "Database Systems",
      questions: [
        // ── Easy (difficulty 1) ──
        { prompt: "What is a primary key used for?", options: ["Unique row identification", "Changing text color", "Encrypting Wi-Fi", "Sorting images"], correct: 0, difficulty: 1 },
        { prompt: "SQL is mainly used to do what?", options: ["Edit photos", "Query and manage data", "Compile Java apps", "Design UIs"], correct: 1, difficulty: 1 },
        { prompt: "Which command retrieves records from a table?", options: ["SELECT", "REMOVE", "UPLOAD", "FETCH"], correct: 0, difficulty: 1 },
        { prompt: "What does NULL mean in a database?", options: ["Zero", "Empty string", "Unknown or missing value", "False"], correct: 2, difficulty: 1 },
        { prompt: "What SQL keyword removes duplicate rows from results?", options: ["UNIQUE", "DISTINCT", "FILTER", "NODUP"], correct: 1, difficulty: 1 },
        { prompt: "Which SQL statement adds a new row?", options: ["ADD", "INSERT INTO", "APPEND", "CREATE ROW"], correct: 1, difficulty: 1 },
        // ── Moderate (difficulty 2) ──
        { prompt: "Normalization in databases helps reduce what?", options: ["Redundant data", "Internet speed", "Battery usage", "CPU load"], correct: 0, difficulty: 2 },
        { prompt: "What is a foreign key?", options: ["A key from another country", "A column referencing the primary key of another table", "An encrypted key", "A backup key"], correct: 1, difficulty: 2 },
        { prompt: "What does INNER JOIN return?", options: ["All rows from both tables", "Only matching rows from both tables", "Rows from the left table only", "NULL values only"], correct: 1, difficulty: 2 },
        { prompt: "Which normal form removes partial dependencies?", options: ["1NF", "2NF", "3NF", "BCNF"], correct: 1, difficulty: 2 },
        { prompt: "What does the GROUP BY clause do?", options: ["Sorts rows alphabetically", "Groups rows with the same value for aggregation", "Filters rows by condition", "Removes duplicate columns"], correct: 1, difficulty: 2 },
        { prompt: "What is an index in a database?", options: ["A list of table names", "A data structure to speed up queries", "A foreign key", "A view definition"], correct: 1, difficulty: 2 },
        // ── Hard (difficulty 3) ──
        { prompt: "What does ACID stand for in transactions?", options: ["Atomicity Consistency Isolation Durability", "Access Control Interface Design", "Automated Concurrent Index Definition", "Adaptive Cache Index Data"], correct: 0, difficulty: 3 },
        { prompt: "What is a deadlock in a database?", options: ["A corrupted table", "Two transactions waiting on each other indefinitely", "A missing index", "A timeout error"], correct: 1, difficulty: 3 },
        { prompt: "What is the difference between DELETE and TRUNCATE?", options: ["No difference", "DELETE is logged/reversible; TRUNCATE is not and resets identity", "TRUNCATE uses WHERE; DELETE does not", "DELETE removes the table; TRUNCATE removes a row"], correct: 1, difficulty: 3 },
        { prompt: "What does eventual consistency mean in NoSQL?", options: ["Data is always immediately consistent", "All nodes will reach the same state given enough time", "Writes are rejected during failure", "Reads always return the latest write"], correct: 1, difficulty: 3 },
        // ── More Medium ──
        { prompt: "What is a view in SQL?", options: ["A saved spreadsheet", "A virtual table based on a query", "A table backup", "A type of index"], correct: 1, difficulty: 2 },
        { prompt: "What does a HAVING clause do?", options: ["Filters rows before grouping", "Filters groups after GROUP BY", "Sorts results", "Joins two tables"], correct: 1, difficulty: 2 },
        { prompt: "What is a stored procedure?", options: ["A permanent table", "A precompiled set of SQL statements stored on the server", "A backup script", "An index type"], correct: 1, difficulty: 2 },
        // ── More Hard ──
        { prompt: "What is the CAP theorem?", options: ["Consistency, Availability, Partition tolerance — can only guarantee 2 of 3", "A caching algorithm", "A SQL standard", "An indexing strategy"], correct: 0, difficulty: 3 },
        { prompt: "What is sharding in databases?", options: ["Encrypting data", "Splitting a database horizontally across multiple servers", "Deleting old rows", "Running queries in parallel"], correct: 1, difficulty: 3 },
      ],
    },
    networking: {
      name: "Computer Networking",
      questions: [
        // ── Easy (difficulty 1) ──
        { prompt: "What does IP stand for?", options: ["Internet Protocol", "Internal Process", "Input Port", "Interface Packet"], correct: 0, difficulty: 1 },
        { prompt: "Which device connects multiple networks together?", options: ["Hub", "Switch", "Router", "Repeater"], correct: 2, difficulty: 1 },
        { prompt: "What does DNS resolve?", options: ["IP to MAC", "Domain names to IP addresses", "Ports to protocols", "Packets to frames"], correct: 1, difficulty: 1 },
        { prompt: "Which protocol is used to send email?", options: ["FTP", "HTTP", "SMTP", "DNS"], correct: 2, difficulty: 1 },
        { prompt: "What is the standard port for HTTPS?", options: ["80", "21", "443", "3306"], correct: 2, difficulty: 1 },
        { prompt: "What does LAN stand for?", options: ["Large Area Network", "Local Area Network", "Linked Access Node", "Logical Address Network"], correct: 1, difficulty: 1 },
        // ── Moderate (difficulty 2) ──
        { prompt: "What OSI layer handles routing?", options: ["Layer 1 – Physical", "Layer 2 – Data Link", "Layer 3 – Network", "Layer 4 – Transport"], correct: 2, difficulty: 2 },
        { prompt: "What is the purpose of NAT?", options: ["Encrypt packets", "Translate private IPs to a public IP", "Assign MAC addresses", "Monitor bandwidth"], correct: 1, difficulty: 2 },
        { prompt: "What does TCP guarantee that UDP does not?", options: ["Faster delivery", "Ordered, reliable delivery", "Encrypted transfer", "Multicast support"], correct: 1, difficulty: 2 },
        { prompt: "Which subnet mask corresponds to /24?", options: ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.128"], correct: 2, difficulty: 2 },
        { prompt: "What is ARP used for?", options: ["Resolving IP to MAC address", "Routing between subnets", "Assigning IP addresses", "Encrypting traffic"], correct: 0, difficulty: 2 },
        { prompt: "What protocol automatically assigns IP addresses?", options: ["DNS", "DHCP", "ICMP", "ARP"], correct: 1, difficulty: 2 },
        // ── Hard (difficulty 3) ──
        { prompt: "What is the three-way TCP handshake sequence?", options: ["SYN → ACK → FIN", "SYN → SYN-ACK → ACK", "ACK → SYN → FIN", "CONNECT → AUTH → DATA"], correct: 1, difficulty: 3 },
        { prompt: "What does BGP stand for and what is its role?", options: ["Basic Gateway Protocol — assigns IPs", "Border Gateway Protocol — routes traffic between autonomous systems", "Broadcast Group Protocol — multicasts packets", "Bridged Grid Protocol — connects VLANs"], correct: 1, difficulty: 3 },
        { prompt: "What is a VLAN used for?", options: ["Boost wireless signal", "Logically segment a network on shared physical infrastructure", "Encrypt WAN traffic", "Balance CPU load"], correct: 1, difficulty: 3 },
        { prompt: "What is the difference between TCP sliding window and stop-and-wait?", options: ["Sliding window allows multiple unacknowledged frames; stop-and-wait allows only one", "They are identical", "Stop-and-wait is faster", "Sliding window requires encryption"], correct: 0, difficulty: 3 },
        // ── More Easy ──
        { prompt: "What does a switch do in a network?", options: ["Connects to the internet", "Forwards frames using MAC addresses within a LAN", "Assigns IP addresses", "Encrypts traffic"], correct: 1, difficulty: 1 },
        { prompt: "What protocol checks if a host is reachable?", options: ["FTP", "ICMP (ping)", "SMTP", "HTTP"], correct: 1, difficulty: 1 },
        // ── More Medium ──
        { prompt: "What does QoS stand for in networking?", options: ["Queue of Services", "Quality of Service — prioritizing certain traffic types", "Quick Operating System", "Query over SSL"], correct: 1, difficulty: 2 },
        { prompt: "What is the purpose of a DMZ in networking?", options: ["A dead zone with no signal", "A subnet that exposes public-facing servers while isolating the internal network", "A type of DNS record", "A wireless channel"], correct: 1, difficulty: 2 },
        // ── More Hard ──
        { prompt: "What is OSPF and what algorithm does it use?", options: ["A routing protocol using Dijkstra's shortest path algorithm", "A firewall protocol", "A DNS extension", "A wireless protocol using Bellman-Ford"], correct: 0, difficulty: 3 },
        { prompt: "What is a SYN flood attack?", options: ["Sending fake DNS requests", "Overwhelming a server with half-open TCP connections", "Brute-forcing SSH passwords", "Sniffing unencrypted traffic"], correct: 1, difficulty: 3 },
      ],
    },
    cybersecurity: {
      name: "Cybersecurity Essentials",
      questions: [
        // ── Easy (difficulty 1) ──
        { prompt: "What is phishing?", options: ["A type of firewall", "Tricking users into revealing sensitive info via fake messages", "Scanning for open ports", "Encrypting a hard drive"], correct: 1, difficulty: 1 },
        { prompt: "What does a firewall do?", options: ["Speeds up internet", "Monitors and filters network traffic", "Stores passwords", "Backs up files"], correct: 1, difficulty: 1 },
        { prompt: "What is two-factor authentication (2FA)?", options: ["Two passwords required", "Verification using two different methods", "Two email accounts", "Double encryption"], correct: 1, difficulty: 1 },
        { prompt: "What is malware?", options: ["Slow hardware", "Software designed to damage or gain unauthorized access", "A type of RAM", "A network cable"], correct: 1, difficulty: 1 },
        { prompt: "What does HTTPS protect compared to HTTP?", options: ["Nothing extra", "Encrypts data in transit", "Speeds up loading", "Blocks cookies"], correct: 1, difficulty: 1 },
        { prompt: "Which of these is the strongest password?", options: ["password123", "MyDog2015", "Tr!8#kQ9@mZ", "abc"], correct: 2, difficulty: 1 },
        // ── Moderate (difficulty 2) ──
        { prompt: "What is a SQL injection attack?", options: ["Uploading a virus via USB", "Inserting malicious SQL into input fields to manipulate the database", "Overloading a server with requests", "Spoofing an IP address"], correct: 1, difficulty: 2 },
        { prompt: "What does a VPN do?", options: ["Speeds up your connection", "Encrypts traffic and masks your IP via a remote server", "Blocks all ads", "Provides unlimited bandwidth"], correct: 1, difficulty: 2 },
        { prompt: "What is a zero-day vulnerability?", options: ["A bug fixed on day zero of release", "A flaw unknown to the vendor with no patch yet", "A vulnerability in bootloader code", "A time-based attack"], correct: 1, difficulty: 2 },
        { prompt: "What is the purpose of a DMZ in networking?", options: ["Block all external traffic", "Host public-facing services in an isolated zone", "Encrypt internal emails", "Provide VPN access"], correct: 1, difficulty: 2 },
        { prompt: "What does XSS stand for?", options: ["Extreme Security System", "Cross-Site Scripting", "External Session Spoofing", "Extended SSL Standard"], correct: 1, difficulty: 2 },
        { prompt: "What is the CIA triad in cybersecurity?", options: ["Control, Identity, Access", "Confidentiality, Integrity, Availability", "Certificate, IP, Authentication", "Cipher, Intrusion, Audit"], correct: 1, difficulty: 2 },
        // ── Hard (difficulty 3) ──
        { prompt: "What is a man-in-the-middle attack?", options: ["Installing malware locally", "Intercepting and altering communication between two parties", "Brute-forcing SSH keys", "Exploiting buffer overflow"], correct: 1, difficulty: 3 },
        { prompt: "What does asymmetric encryption use?", options: ["One shared secret key", "A public key to encrypt and a private key to decrypt", "A hash function only", "Two identical private keys"], correct: 1, difficulty: 3 },
        { prompt: "What is a buffer overflow exploit?", options: ["Sending too many network packets", "Writing data beyond a buffer's boundary to overwrite adjacent memory", "Exhausting a database connection pool", "Flooding DNS with requests"], correct: 1, difficulty: 3 },
        { prompt: "What is privilege escalation?", options: ["Granting admin rights to users", "An attacker gaining higher permissions than originally assigned", "Encrypting root access", "A method to speed up login"], correct: 1, difficulty: 3 },
        // ── More Easy ──
        { prompt: "What is ransomware?", options: ["A privacy tool", "Malware that encrypts files and demands payment for the key", "A type of antivirus", "A network monitor"], correct: 1, difficulty: 1 },
        { prompt: "What does SSL/TLS do?", options: ["Blocks spam email", "Encrypts communication between client and server", "Speeds up web pages", "Scans for malware"], correct: 1, difficulty: 1 },
        // ── More Medium ──
        { prompt: "What is social engineering in cybersecurity?", options: ["Writing secure code", "Manipulating people to reveal confidential information", "Configuring firewalls", "Auditing server logs"], correct: 1, difficulty: 2 },
        { prompt: "What is a honeypot?", options: ["A cached data store", "A decoy system designed to lure and detect attackers", "A type of firewall rule", "An encryption algorithm"], correct: 1, difficulty: 2 },
        { prompt: "What does CSRF stand for?", options: ["Cross-Site Request Forgery", "Cached Session Response Fail", "Central Security Response Framework", "Client-Side Resource Filter"], correct: 0, difficulty: 2 },
        // ── More Hard ──
        { prompt: "What is the difference between IDS and IPS?", options: ["They are identical", "IDS detects threats passively; IPS actively blocks them", "IPS only works on wireless", "IDS requires manual configuration always"], correct: 1, difficulty: 3 },
        { prompt: "What is a rainbow table attack?", options: ["A brute force dictionary attack", "Using precomputed hash-to-password mappings to crack hashes", "A network traffic analysis technique", "Exploiting rainbow-colored captchas"], correct: 1, difficulty: 3 },
      ],
    },
  };

  const TOPIC_CARD_META = {
    programming:   { accent: "#2d83ff", label: "Coding Focus" },
    hardware:      { accent: "#27c37b", label: "System Focus" },
    database:      { accent: "#f0b429", label: "Data Focus" },
    networking:    { accent: "#a855f7", label: "Network Focus" },
    cybersecurity: { accent: "#ef4444", label: "Security Focus" },
  };

  const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2600];
  const LEVEL_NAMES = ["Starter", "Mover", "Builder", "Performer", "Champion", "Legend"];
  const DAY_LIMIT = 365;
  const DIFFICULTY_LABELS = { 1: "Easy", 2: "Moderate", 3: "Advanced" };
  const TOPIC_BY_DIFFICULTY = { 1: "programming", 2: "hardware", 3: "database" };
  const ALL_TOPIC_KEYS = ["programming", "hardware", "database", "networking", "cybersecurity"];

  const EXERCISE_RULES = {
    "jumping-jacks": { difficulty: 1, minDay: 1 },
    "high-knees": { difficulty: 1, minDay: 1 },
    squats: { difficulty: 1, minDay: 1 },
    "push-ups": { difficulty: 2, minDay: 4 },
    "mountain-climbers": { difficulty: 2, minDay: 6 },
    "jump-rope": { difficulty: 2, minDay: 8 },
    "dumbbell-goblet-squat": { difficulty: 2, minDay: 10 },
    "dumbbell-press": { difficulty: 3, minDay: 14 },
    "bent-over-row": { difficulty: 3, minDay: 16 },
    "romanian-deadlift": { difficulty: 3, minDay: 18 },
  };

  // ─── Achievements ──────────────────────────────────────────────────────────────
  const ACHIEVEMENTS = [
    // ── Workout milestones ──
    { id: "first_rep",      icon: "🏃", name: "First Rep",        desc: "Complete your first workout." },
    { id: "five_workouts",  icon: "💪", name: "Iron Will",         desc: "Complete 5 workouts." },
    { id: "ten_workouts",   icon: "🏋️", name: "Dedicated",         desc: "Complete 10 workouts." },
    { id: "twenty_workouts",icon: "🦾", name: "Machine",           desc: "Complete 20 workouts." },
    // ── Streaks ──
    { id: "streak_3",       icon: "🔥", name: "On Fire",           desc: "Maintain a 3-day streak." },
    { id: "streak_7",       icon: "⚡", name: "Week Warrior",      desc: "Hit a 7-day streak." },
    { id: "streak_14",      icon: "🌊", name: "Unstoppable",       desc: "Hit a 14-day streak." },
    { id: "streak_30",      icon: "🏆", name: "Month Titan",       desc: "Hit a 30-day streak." },
    // ── Program days ──
    { id: "day_7",          icon: "📅", name: "Week One Done",     desc: "Complete 7 program days." },
    { id: "day_14",         icon: "📆", name: "Fortnight Grind",   desc: "Complete 14 program days." },
    { id: "day_30",         icon: "🗓️", name: "Full Month",         desc: "Complete 30 program days." },
    // ── Quiz ──
    { id: "quiz_ace",       icon: "🧠", name: "Quiz Ace",          desc: "Get 100% on a quiz." },
    { id: "sharpshooter",   icon: "🎯", name: "Sharpshooter",      desc: "90%+ quiz accuracy (10+ answered)." },
    { id: "quiz_100",       icon: "📚", name: "Scholar",           desc: "Answer 100 quiz questions total." },
    { id: "hard_quiz",      icon: "🔬", name: "Genius",            desc: "Answer an Advanced quiz perfectly." },
    { id: "quiz_50",        icon: "📖", name: "Knowledge Seeker",  desc: "Answer 50 quiz questions." },
    { id: "quiz_speed",     icon: "⚡", name: "Lightning Brain",   desc: "Answer 5 questions correctly in a row." },
    // ── Specialization ──
    { id: "cardio_king",    icon: "🏃", name: "Cardio King",       desc: "Complete 15 cardio sessions." },
    { id: "iron_lifter",    icon: "🏋️", name: "Iron Lifter",       desc: "Complete 15 weightlifting sessions." },
    { id: "cardio_5",       icon: "🚶", name: "Runner",            desc: "Complete 5 cardio sessions." },
    { id: "lift_5",         icon: "💪", name: "Lifter",            desc: "Complete 5 weightlifting sessions." },
    { id: "hybrid",         icon: "⚡", name: "Hybrid Athlete",    desc: "Complete 10 of each type." },
    // ── Levels ──
    { id: "level_3",        icon: "🌟", name: "Rising Star",       desc: "Reach Level 3." },
    { id: "champion",       icon: "🏆", name: "Champion",          desc: "Reach Level 5." },
    { id: "legend",         icon: "⭐", name: "Legend",            desc: "Reach the final level." },
    // ── Calories ──
    { id: "cal_1000",       icon: "🔥", name: "Burner",            desc: "Burn 1,000 total calories." },
    { id: "cal_5000",       icon: "🌋", name: "Inferno",           desc: "Burn 5,000 total calories." },
    // ── XP ──
    { id: "xp_500",         icon: "💫", name: "Point Collector",   desc: "Earn 500 total XP." },
    { id: "xp_2000",        icon: "🪐", name: "XP Machine",        desc: "Earn 2,000 total XP." },
    { id: "xp_5000",        icon: "🌠", name: "XP God",            desc: "Earn 5,000 total XP." },
    // ── Shop ──
    { id: "first_buy",      icon: "🛒", name: "First Purchase",    desc: "Buy something from the shop." },
    { id: "collector",      icon: "💎", name: "Collector",         desc: "Own 5 shop items." },
    { id: "big_spender",    icon: "💸", name: "Big Spender",       desc: "Spend 2,000 XP in the shop." },
    // ── Special ──
    { id: "early_bird",     icon: "🌅", name: "Early Bird",        desc: "Complete a workout before 8 AM." },
    { id: "late_night",     icon: "🦉", name: "Night Owl",         desc: "Complete a workout after 9 PM." },
    { id: "perfect_week",   icon: "👑", name: "Perfect Week",      desc: "Complete 7 days without missing." },
  ];

  // ─── Colors ────────────────────────────────────────────────────────────────────
  const COLORS = {
    appBg:    "#06121b",
    panel:    "#0c1d2b",
    panelAlt: "#11283b",
    border:   "#1f3f5a",
    text:     "#eaf7ff",
    textMuted:"#8fb2c7",
    primary:  "#14b8a6",
    primaryLight: "#2dd4bf",
    accent:   "#f97316",
    success:  "#22c55e",
    warning:  "#f59e0b",
    danger:   "#ef4444",
    xp:       "#38bdf8",
    streak:   "#fb923c",
    gold:     "#fbbf24",
    neon:     "#34d399",
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  function parsePositiveNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function getLevelInfo(points) {
    let index = 0;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
      if (points >= LEVEL_THRESHOLDS[i]) { index = i; break; }
    }
    const floor = LEVEL_THRESHOLDS[index];
    const nextThreshold = LEVEL_THRESHOLDS[index + 1] || null;
    const percent = nextThreshold
      ? Math.min(100, Math.round(((points - floor) / (nextThreshold - floor)) * 100))
      : 100;
    return { level: index + 1, name: LEVEL_NAMES[index], floor, nextThreshold, percent };
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function getProgramDays(value) {
    const parsed = parsePositiveNumber(value);
    if (!parsed) return DAY_LIMIT;
    return clamp(Math.round(parsed), 1, DAY_LIMIT);
  }

  function getNextUnlockedDay(completedDays, totalDays) {
    const normalized = [...new Set((completedDays || [])
      .map((day) => Number(day))
      .filter((day) => Number.isFinite(day) && day >= 1 && day <= totalDays))]
      .sort((a, b) => a - b);
    let nextDay = 1;
    for (const day of normalized) {
      if (day === nextDay) { nextDay += 1; continue; }
      if (day > nextDay) break;
    }
    return clamp(nextDay, 1, totalDays);
  }

  // Returns true if the player must wait until tomorrow to start the next day.
  // Rule: if the last completed day was finished TODAY, the next day is locked until tomorrow.
  function isNextDayLockedUntilTomorrow(completedDays, dayCompletionDates, totalDays) {
    const today = getDateKey();
    const unlockedDay = getNextUnlockedDay(completedDays, totalDays);
    const lastCompletedDay = unlockedDay - 1;
    if (lastCompletedDay < 1) return false; // no days done yet, nothing locked
    const lastDate = (dayCompletionDates || {})[lastCompletedDay];
    return lastDate === today;
  }

  function getDayDifficultyTier(dayNumber, totalDays, userLevel) {
    const safeTotalDays = Math.max(1, totalDays);
    const safeDay = clamp(dayNumber || 1, 1, safeTotalDays);
    const progress = safeTotalDays > 1 ? (safeDay - 1) / (safeTotalDays - 1) : 0;
    const levelBoost = userLevel >= 5 ? 0.35 : userLevel >= 3 ? 0.18 : 0;
    const score = progress + levelBoost;
    if (score < 0.34) return 1;
    if (score < 0.72) return 2;
    return 3;
  }

  function buildDayWorkoutPlan({ dayNumber, totalDays, userLevel, exerciseHistory, currentTopicKey }) {
    const difficultyTier = getDayDifficultyTier(dayNumber, totalDays, userLevel);
    const workoutType = dayNumber <= 8 ? "cardio" : dayNumber % 2 === 0 ? "weightlifting" : "cardio";
    const targetExerciseCount = difficultyTier === 1 ? 3 : difficultyTier === 2 ? 4 : 5;
    const history = exerciseHistory || {};
    const baseCandidates = EXERCISES.filter((exercise) => {
      const rule = EXERCISE_RULES[exercise.id] || { difficulty: 2, minDay: 1 };
      return exercise.type === workoutType && rule.minDay <= dayNumber && rule.difficulty <= difficultyTier;
    });
    const widenedCandidates = baseCandidates.length >= targetExerciseCount
      ? baseCandidates
      : EXERCISES.filter((exercise) => {
          const rule = EXERCISE_RULES[exercise.id] || { difficulty: 2, minDay: 1 };
          return exercise.type === workoutType && rule.minDay <= dayNumber && rule.difficulty <= difficultyTier + 1;
        });
    const candidatePool = widenedCandidates.length ? widenedCandidates : EXERCISES.filter((e) => e.type === workoutType);
    const orderedCandidates = [...candidatePool].sort((a, b) => {
      const aHistory = history[a.id] || 0;
      const bHistory = history[b.id] || 0;
      if (aHistory !== bHistory) return aHistory - bHistory;
      const aRule = EXERCISE_RULES[a.id] || { difficulty: 2 };
      const bRule = EXERCISE_RULES[b.id] || { difficulty: 2 };
      if (aRule.difficulty !== bRule.difficulty) return aRule.difficulty - bRule.difficulty;
      return a.durationSec - b.durationSec;
    });
    const selectedExerciseIds = orderedCandidates.slice(0, Math.min(targetExerciseCount, orderedCandidates.length)).map((e) => e.id);
    const safeExerciseIds = selectedExerciseIds.length ? selectedExerciseIds : ["jumping-jacks", "high-knees", "squats"];
    const plannedQuestionCount = clamp(2 + difficultyTier + Math.floor(dayNumber / Math.max(1, Math.ceil(totalDays / 4))), 3, 6);
    return {
      dayNumber,
      difficultyTier,
      workoutType,
      exerciseIds: safeExerciseIds,
      plannedQuestionCount,
      topicKey: currentTopicKey || TOPIC_BY_DIFFICULTY[difficultyTier] || "programming",
    };
  }

  function getDateKey(date) {
    const d = date || new Date();
    return d.toISOString().slice(0, 10);
  }

  function checkAchievements(stats, quizResult) {
    const already = new Set(stats.unlockedAchievements || []);
    const newlyUnlocked = [];
    const add = (id) => { if (!already.has(id)) newlyUnlocked.push(id); };

    // Workout milestones
    if (stats.totalWorkouts >= 1) add("first_rep");
    if (stats.totalWorkouts >= 5) add("five_workouts");

    // Streaks
    if ((stats.currentStreak || 0) >= 3) add("streak_3");
    if ((stats.currentStreak || 0) >= 7) add("streak_7");
    if ((stats.currentStreak || 0) >= 14) add("streak_14");
    if ((stats.currentStreak || 0) >= 30) add("streak_30");

    // Quiz
    if (quizResult && quizResult.correct === quizResult.total && quizResult.total > 0) add("quiz_ace");
    const accuracy = stats.quizAnswered > 0 ? stats.quizCorrect / stats.quizAnswered : 0;
    if (accuracy >= 0.9 && stats.quizAnswered >= 10) add("sharpshooter");
    if (stats.quizAnswered >= 50) add("quiz_50");
    if (stats.quizAnswered >= 100) add("quiz_100");

    // Levels
    const level = getLevelInfo(stats.points).level;
    if (level >= 3) add("level_3");
    if (level >= 5) add("champion");
    if (level >= 6) add("legend");

    // Days
    if ((stats.completedDays || []).length >= 7) add("day_7");
    if ((stats.completedDays || []).length >= 14) add("day_14");
    if ((stats.completedDays || []).length >= 30) add("day_30");

    // Workout type specializations
    const cardioCount = (stats.workoutTypeHistory || {}).cardio || 0;
    const liftCount = (stats.workoutTypeHistory || {}).weightlifting || 0;
    if (cardioCount >= 5) add("cardio_5");
    if (liftCount >= 5) add("lift_5");
    if (cardioCount >= 15) add("cardio_king");
    if (liftCount >= 15) add("iron_lifter");
    if (cardioCount >= 10 && liftCount >= 10) add("hybrid");

    // XP milestones
    if (stats.points >= 500) add("xp_500");
    if (stats.points >= 2000) add("xp_2000");
    if (stats.points >= 5000) add("xp_5000");

    // Calories (totalCalories must be tracked in stats)
    if ((stats.totalCalories || 0) >= 1000) add("cal_1000");
    if ((stats.totalCalories || 0) >= 5000) add("cal_5000");

    return newlyUnlocked;
  }

  // ─── Shared Components ─────────────────────────────────────────────────────────

  function AppScroll({ children }) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }

  function PrimaryButton({ label, onPress, disabled = false, style, textStyle }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.primaryButton,
          style,
          pressed && !disabled ? styles.buttonPressed : null,
          disabled ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={[styles.primaryButtonText, textStyle]}>{label}</Text>
      </Pressable>
    );
  }

  function RingCard({ label, value, target, unit, color, pulseAnim }) {
    const percent = Math.min(100, Math.round((value / target) * 100));
    return (
      <Animated.View style={[styles.ringPulseWrap, pulseAnim ? { transform: [{ scale: pulseAnim }] } : null]}>
        <View style={styles.ringCard}>
          <View style={[styles.ringOuter, { borderColor: `${color}33` }]}>
            <View style={[styles.ringInner, { borderColor: color }]}>
              <Text style={styles.ringPercent}>{`${percent}%`}</Text>
            </View>
          </View>
          <Text style={styles.ringLabel}>{label}</Text>
          <Text style={styles.ringValue}>{`${Math.round(value)} ${unit}`}</Text>
          <View style={styles.ringTrack}>
            <View style={[styles.ringFill, { width: `${percent}%`, backgroundColor: color }]} />
          </View>
        </View>
      </Animated.View>
    );
  }

  function StatCard({ label, value, accent }) {
    return (
      <View style={[styles.statCard, accent ? { borderColor: `${accent}55` } : null]}>
        <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  // XP progress bar component
  function XPBar({ points }) {
    const level = getLevelInfo(points);
    const animVal = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(animVal, {
        toValue: level.percent,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, [level.percent]);
    const barWidth = animVal.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
    return (
      <View style={styles.xpBarWrap}>
        <View style={styles.xpBarLabels}>
          <Text style={styles.xpLevelText}>{`LVL ${level.level}  ${level.name.toUpperCase()}`}</Text>
          <Text style={styles.xpPointsText}>
            {level.nextThreshold ? `${points} / ${level.nextThreshold} XP` : `${points} XP — MAX`}
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <Animated.View style={[styles.xpFill, { width: barWidth }]} />
          <View style={[styles.xpGlow, { left: `${level.percent}%` }]} />
        </View>
      </View>
    );
  }

  // Small achievement badge
  function AchievementChip({ achievement, unlocked }) {
    return (
      <View style={[styles.achChip, unlocked ? styles.achChipUnlocked : styles.achChipLocked]}>
        <Text style={styles.achIcon}>{unlocked ? achievement.icon : "🔒"}</Text>
        <Text style={[styles.achName, unlocked ? styles.achNameUnlocked : null]} numberOfLines={1}>
          {achievement.name}
        </Text>
      </View>
    );
  }

  // Streak counter badge
  function StreakBadge({ streak }) {
    if (!streak || streak < 1) return null;
    return (
      <View style={styles.streakBadge}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakText}>{streak}</Text>
        <Text style={styles.streakLabel}>{streak === 1 ? "day" : "days"}</Text>
      </View>
    );
  }

  // ─── PlayerSetupScreen ────────────────────────────────────────────────────────

  function PlayerSetupScreen({ profile, setProfile, onContinue }) {

    const [step, setStep] = useState(0); // 0=name, 1=goal, 2=avatar
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [error, setError] = useState(null);
    const hasName = profile.displayName.trim().length >= 2;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const loadingTimersRef = useRef([]);

    const LOADING_MESSAGES = [
      "Registering your legend in the Hall of FitQuest...",
      "Forging your avatar gear and calibrating your battle stats...",
      "Opening the training arena and syncing your first challenge...",
    ];

    function clearLoadingTimers() {
      loadingTimersRef.current.forEach((id) => clearTimeout(id));
      loadingTimersRef.current = [];
    }

    useEffect(() => () => clearLoadingTimers(), []);

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ).start();
    }, []);

    const glowColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(124,58,237,0.3)", "rgba(168,85,247,0.7)"] });

    function goNext() {
      if (!hasName) {
        setError("Please enter a name with at least 2 characters.");
        return;
      }
      setError(null);
      setStep((s) => s + 1);
    }

    function finalizeSetup() {
      if (!goalReady) {
        setError("Please choose a goal to continue.");
        return;
      }

      clearLoadingTimers();
      setIsLoading(true);
      setLoadingMessageIndex(0);
      setError(null);
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      const messageDurationsMs = LOADING_MESSAGES.map((msg) => Math.max(1800, 900 + msg.length * 30));
      let elapsedMs = 0;

      for (let i = 1; i < LOADING_MESSAGES.length; i += 1) {
        elapsedMs += messageDurationsMs[i - 1];
        const timerId = setTimeout(() => setLoadingMessageIndex(i), elapsedMs);
        loadingTimersRef.current.push(timerId);
      }

      const totalDurationMs = messageDurationsMs.reduce((sum, ms) => sum + ms, 0);
      const finishTimerId = setTimeout(() => {
        setIsLoading(false);
        onContinue();
      }, totalDurationMs);
      loadingTimersRef.current.push(finishTimerId);
    }

    const GOAL_ICONS = { lose: "🔥", gain: "💪", maintain: "⚡" };
    const goalReady = Boolean(profile.goal);

    if (step === 0) return (
      <View style={styles.onboardWrap}>
        <View style={[styles.onboardLogoWrap, { justifyContent: "center", alignItems: "center" }]}> 
          <Image source={require("./assets/fitlogo.png")} style={{ width: 200, height: 200, marginBottom: 10 }} resizeMode="contain" />
          <Text style={styles.onboardLogoTitle}>FITQUEST</Text>
          <Text style={styles.onboardLogoSub}>GAMIFIED FITNESS · IT STUDENTS</Text>
        </View>
        <View style={styles.onboardPillRow}>
          {["🔥 Streaks", "🏆 Badges", "⭐ Levels", "🧠 Quizzes", "👾 Avatar"].map((t) => (
            <View key={t} style={styles.onboardPill}><Text style={styles.onboardPillText}>{t}</Text></View>
          ))}
        </View>
        <View style={styles.onboardCard}>
          <Text style={styles.onboardCardLabel}>YOUR HERO NAME</Text>
          <TextInput
            value={profile.displayName}
            onChangeText={(v) => setProfile((p) => ({ ...p, displayName: v }))}
            placeholder="Enter username…"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            style={styles.onboardInput}
            maxLength={20}
          />
          <Text style={styles.onboardHint}>Enter your username, you can change it later on "Edit Profile".</Text>
        </View>
        <Pressable
          onPress={goNext}
          disabled={!hasName}
          style={[styles.onboardBtn, !hasName && { opacity: 0.4 }]} // Dim only when name is invalid
        >
          <Text style={styles.onboardBtnText}>CHOOSE YOUR GOAL  →</Text>
        </Pressable>
      </View>
    );

    if (step === 1) return (
      <AppScroll>
        <View style={styles.onboardStepHeader}>
          <Pressable onPress={() => setStep(0)} style={styles.backChip}>
            <Text style={styles.backChipText}>← Back</Text>
          </Pressable>
          <Text style={styles.onboardStepLabel}>STEP 2 OF 2</Text>
        </View>
        <Text style={styles.onboardBigTitle}>What's your{"\n"}goal? 🎯</Text>
        <Text style={styles.onboardStepSub}>Choose your fitness mission. This shapes your daily program.</Text>

        {GOAL_OPTIONS.map((goal) => {
          const active = profile.goal === goal.id;
          return (
            <Pressable
              key={goal.id}
              onPress={() => !isLoading && setProfile((p) => ({ ...p, goal: goal.id }))}
              disabled={isLoading}
              style={[styles.goalBigCard, active ? styles.goalBigCardActive : null, isLoading && { opacity: 0.5 }]}
            >
              <Text style={styles.goalBigIcon}>{GOAL_ICONS[goal.id]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalBigLabel, active ? { color: COLORS.primaryLight } : null]}>{goal.label}</Text>
                <Text style={styles.goalBigSub}>{goal.subtitle}</Text>
              </View>
              {active && <View style={styles.goalBigCheck}><Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text></View>}
            </Pressable>
          );
        })}

        <View style={[styles.panel, { marginTop: 12, opacity: isLoading ? 0.5 : 1 }]}> 
          <Text style={styles.inputLabel}>COMMITMENT (days)</Text>
          <TextInput
            value={profile.programDays}
            onChangeText={(v) => setProfile((p) => ({ ...p, programDays: v.replace(/[^0-9]/g, "") }))}
            keyboardType="number-pad"
            placeholder="e.g. 30"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            maxLength={3}
            editable={!isLoading}
            selectTextOnFocus={!isLoading}
          />
          <Text style={styles.sectionSubtitle}>Days 1–365. Each completed day unlocks the next.</Text>
        </View>

        {isLoading ? (
          <Text style={styles.onboardLoadingNarration}>{LOADING_MESSAGES[loadingMessageIndex]}</Text>
        ) : null}

        <Pressable
          onPress={isLoading ? null : finalizeSetup}
          disabled={!goalReady || isLoading}
          style={[styles.onboardBtn, { marginTop: 8 }, !goalReady && { opacity: 0.4 }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.onboardBtnText}>START YOUR QUEST  ⚔️</Text>
          )}
        </Pressable>
      </AppScroll>
    );

    return null;
  }


  // ─── DashboardScreen ─────────────────────────────────────────────────────────

  function DashboardScreen({ profile, stats, character, onStartWorkout, onOpenProgress, onOpenArmory, onOpenCharacter }) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const level = getLevelInfo(stats.points);
    const quizAccuracy = stats.quizAnswered > 0
      ? Math.round((stats.quizCorrect / stats.quizAnswered) * 100) : 0;
    const avatarLetter = (profile.displayName || "?")[0].toUpperCase();
    const unlockedCount = (stats.unlockedAchievements || []).length;

    const pulseSteps = useRef(new Animated.Value(1)).current;
    const pulseCalories = useRef(new Animated.Value(1)).current;
    const pulseActive = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const makePulse = (animatedValue, delay = 0) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, { toValue: 1.08, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 1,    duration: 320, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 1.06, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 1,    duration: 260, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
        ]);
      makePulse(pulseSteps, 0).start();
      makePulse(pulseCalories, 120).start();
      makePulse(pulseActive, 240).start();
    }, []);

    return (
      <View style={styles.dashboardBackgroundWrap}>
        <Image
          source={DASHBOARD_BG_SOURCE}
          style={[styles.dashboardBgImage, { width: windowWidth, height: windowHeight }]}
          resizeMode="cover"
          fadeDuration={0}
          pointerEvents="none"
        />
        <View style={[styles.dashboardBgOverlay, { width: windowWidth, height: windowHeight }]} pointerEvents="none" />
        <AppScroll>
        {/* ── Player HUD Card ── */}
        <View style={styles.playerHUDCard}>
          <View style={styles.playerHUDTop}>
            {/* Mini character in HUD */}
            <View style={{ width: 72, height: 90, overflow: "hidden", marginRight: 12, alignItems: "center", justifyContent: "flex-start" }}>
              {character ? (
                <CharacterAvatar character={character} size={72} workoutTypeHistory={stats.workoutTypeHistory || {}} />
              ) : (
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarLetter}>{avatarLetter}</Text>
                </View>
              )}
            </View>
            <View style={styles.playerHUDInfo}>
              <Text style={styles.playerHUDName}>{profile.displayName}</Text>
              <View style={styles.playerHUDBadgeRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{`LVL ${level.level}`}</Text>
                </View>
                {(stats.currentStreak || 0) >= 1 && (
                  <StreakBadge streak={stats.currentStreak} />
                )}
              </View>
            </View>
            <Pressable onPress={onOpenArmory} style={styles.armoryButton}>
              <Text style={styles.armoryButtonIcon}>🛒</Text>
            </Pressable>
            <Pressable onPress={onOpenCharacter} style={[styles.armoryButton, { marginLeft: 6 }]}>
              <Text style={styles.armoryButtonIcon}>🧍</Text>
            </Pressable>
          </View>

          <XPBar points={stats.points} />
        </View>

        {/* ── Daily Progress Rings ── */}
        <Text style={styles.sectionTitle}>Daily Activity</Text>
        <View style={styles.ringRow}>
          <RingCard label="Steps"   value={stats.today.steps}        target={8000} unit="steps" color={COLORS.primary}  pulseAnim={pulseSteps} />
          <RingCard label="Calories" value={stats.today.calories}    target={500}  unit="kcal"  color={COLORS.warning}  pulseAnim={pulseCalories} />
          <RingCard label="Active"  value={stats.today.activeMinutes} target={45}  unit="min"   color={COLORS.success}  pulseAnim={pulseActive} />
        </View>

        {/* ── Main CTA ── */}
        <PrimaryButton
          label="⚡  START WORKOUT"
          onPress={onStartWorkout}
          style={styles.ctaButton}
          textStyle={styles.ctaButtonText}
        />

        {/* ── Stats Grid ── */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statGrid}>
          <StatCard label="Workouts"     value={stats.totalWorkouts}  accent={COLORS.primary} />
          <StatCard label="Exercises"    value={stats.totalExercises} accent={COLORS.success} />
          <StatCard label="Quiz Correct" value={`${stats.quizCorrect}/${stats.quizAnswered}`} accent={COLORS.xp} />
          <StatCard label="Accuracy"     value={`${quizAccuracy}%`}   accent={COLORS.warning} />
        </View>

        {/* ── Achievements Row ── */}
        <View style={styles.achSectionHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.achCountBadge}>{`${unlockedCount}/${ACHIEVEMENTS.length}`}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achScroll} contentContainerStyle={styles.achScrollContent}>
          {ACHIEVEMENTS.map((ach) => (
            <AchievementChip key={ach.id} achievement={ach} unlocked={(stats.unlockedAchievements || []).includes(ach.id)} />
          ))}
        </ScrollView>

        {/* ── Secondary Actions ── */}
        <PrimaryButton
          label="View Full Progress"
          onPress={onOpenProgress}
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
        />
        </AppScroll>
      </View>
    );
  }

  // ─── DaySelectionScreen ───────────────────────────────────────────────────────

  function DaySelectionScreen({ profile, stats, workoutPlan, setWorkoutPlan, onBack, onContinue }) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const totalDays = getProgramDays(profile.programDays);
    const completedDays = stats.completedDays || [];
    const unlockedDay = getNextUnlockedDay(completedDays, totalDays);
    const selectedDay = clamp(workoutPlan.dayNumber || unlockedDay, 1, totalDays);
    const userLevel = getLevelInfo(stats.points).level;
    const previewDifficulty = getDayDifficultyTier(selectedDay, totalDays, userLevel);

    const tomorrowLocked = isNextDayLockedUntilTomorrow(completedDays, stats.dayCompletionDates, totalDays);

    const dayEntries = useMemo(() => Array.from({ length: totalDays }, (_, index) => {
      const dayNumber = index + 1;
      const lockedFuture = dayNumber > unlockedDay;
      const lockedToday = !lockedFuture && dayNumber === unlockedDay && tomorrowLocked && !completedDays.includes(dayNumber);
      const locked = lockedFuture || lockedToday;
      const completed = completedDays.includes(dayNumber);
      const active = selectedDay === dayNumber;
      const difficultyTier = getDayDifficultyTier(dayNumber, totalDays, userLevel);
      const planned = buildDayWorkoutPlan({ dayNumber, totalDays, userLevel, exerciseHistory: stats.exerciseHistory, currentTopicKey: workoutPlan.topicKey });
      const exercises = planned.exerciseIds.map((id) => EXERCISES.find((e) => e.id === id)).filter(Boolean);
      const totalSeconds = exercises.reduce((sum, e) => sum + e.durationSec, 0);
      const totalCalories = Math.round(exercises.reduce((sum, e) => sum + ((e.caloriesPerMinute * e.durationSec) / 60), 0));
      const previewType = WORKOUT_TYPES.find((t) => t.id === planned.workoutType) || WORKOUT_TYPES[0];
      return { dayNumber, locked, lockedToday, completed, active, difficultyTier, minutes: Math.max(1, Math.round(totalSeconds / 60)), calories: Math.max(20, totalCalories), workoutTypeLabel: previewType.label };
    }), [totalDays, unlockedDay, completedDays, selectedDay, userLevel, stats.exerciseHistory, workoutPlan.topicKey, tomorrowLocked]);

    const completionPercent = Math.round((completedDays.length / totalDays) * 100);
    const topFlyX = useRef(new Animated.Value(-36)).current;
    const topFlyY = useRef(new Animated.Value(-12)).current;
    const topOpacity = useRef(new Animated.Value(0)).current;
    const daysSlideY = useRef(new Animated.Value(56)).current;
    const daysOpacity = useRef(new Animated.Value(0)).current;
    const daysStaggerProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      topFlyX.setValue(-36);
      topFlyY.setValue(-12);
      topOpacity.setValue(0);
      daysSlideY.setValue(56);
      daysOpacity.setValue(0);
      daysStaggerProgress.setValue(0);

      Animated.parallel([
        Animated.timing(topFlyX, { toValue: 0, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(topFlyY, { toValue: 0, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(topOpacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        Animated.timing(daysSlideY, { toValue: 0, duration: 480, delay: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(daysOpacity, { toValue: 1, duration: 380, delay: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(daysStaggerProgress, { toValue: 1, duration: 900, delay: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, []);

    useEffect(() => {
      if (!workoutPlan.dayNumber || workoutPlan.dayNumber > unlockedDay || workoutPlan.dayNumber < 1) {
        setWorkoutPlan((p) => ({ ...p, dayNumber: unlockedDay }));
      }
    }, [workoutPlan.dayNumber, unlockedDay, setWorkoutPlan]);

    return (
      <View style={styles.daySelectBackgroundWrap}>
        <Image
          source={DAY_SELECT_BG_SOURCE}
          style={[styles.daySelectBgImage, { width: windowWidth, height: windowHeight }]}
          resizeMode="cover"
          fadeDuration={0}
          pointerEvents="none"
        />
        <View style={[styles.daySelectBgOverlay, { width: windowWidth, height: windowHeight }]} pointerEvents="none" />
        <AppScroll>
          <Animated.View style={{ opacity: topOpacity, transform: [{ translateX: topFlyX }, { translateY: topFlyY }] }}>
            <Pressable onPress={onBack} style={styles.dayTopBackButton}>
              <Text style={styles.dayTopBackButtonText}>{"<"}</Text>
            </Pressable>

            <Text style={styles.dayPlanOverline}>{`${totalDays}-DAY`}</Text>
            <Text style={styles.dayPlanTitle}>FULL BODY FITQUEST</Text>
            <Text style={styles.dayPlanSubtitle}>Scroll through your day cards. Future days stay locked until earlier days are completed.</Text>

            <View style={styles.dayBannerCard}>
              <Text style={styles.dayBannerEyebrow}>Progressive Training</Text>
              <Text style={styles.dayBannerTitle}>{`${completionPercent}% COMPLETE`}</Text>
              <Text style={styles.dayBannerMeta}>{`Current pick: Day ${selectedDay} • ${DIFFICULTY_LABELS[previewDifficulty]} • Unlocked up to Day ${unlockedDay}`}</Text>
            </View>

            <Text style={styles.dayStageTitle}>Stage 1: Ignite The Burn</Text>
          </Animated.View>

          <Animated.View style={[styles.dayTimelineWrap, { opacity: daysOpacity, transform: [{ translateY: daysSlideY }] }]}>
          {dayEntries.map((entry, index) => {
            const isLast = index === dayEntries.length - 1;
            const statusText = entry.locked ? (entry.lockedToday ? "🌙 Tomorrow" : "🔒 Locked") : entry.completed ? "✓ Finished" : entry.active ? "▶ Selected" : "Open";
            const staggerIndex = Math.min(index, 16);
            const rowStart = staggerIndex * 0.045;
            const rowEnd = Math.min(1, rowStart + 0.24);
            const rowTranslateY = daysStaggerProgress.interpolate({
              inputRange: [0, rowStart, rowEnd, 1],
              outputRange: [22, 22, 0, 0],
              extrapolate: "clamp",
            });
            const rowOpacity = daysStaggerProgress.interpolate({
              inputRange: [0, rowStart, rowEnd, 1],
              outputRange: [0, 0, 1, 1],
              extrapolate: "clamp",
            });
            return (
              <Animated.View key={`day-${entry.dayNumber}`} style={{ opacity: rowOpacity, transform: [{ translateY: rowTranslateY }] }}>
              <View style={styles.dayTimelineRow}>
                <View style={styles.dayRailColumn}>
                  {index > 0 ? <View style={styles.dayRailLine} /> : <View style={styles.dayRailSpacer} />}
                  <View style={[styles.dayRailDot, entry.completed ? styles.dayRailDotCompleted : null, entry.active ? styles.dayRailDotActive : null, entry.locked ? styles.dayRailDotLocked : null]} />
                  {!isLast ? <View style={styles.dayRailLine} /> : <View style={styles.dayRailSpacer} />}
                </View>
                <Pressable
                  onPress={() => setWorkoutPlan((p) => ({ ...p, dayNumber: entry.dayNumber }))}
                  disabled={entry.locked}
                  style={[styles.dayTimelineCard, entry.completed ? styles.dayTimelineCardCompleted : null, entry.active ? styles.dayTimelineCardActive : null, entry.locked ? styles.dayTimelineCardLocked : null]}
                >
                  <Text style={[styles.dayStatusPill, entry.completed ? styles.dayStatusPillCompleted : null, entry.active && !entry.completed ? styles.dayStatusPillActive : null, entry.locked ? styles.dayStatusPillLocked : null]}>
                    {statusText}
                  </Text>
                  <View style={styles.dayTimelineCardTop}>
                    <View style={styles.dayTimelineCardTextWrap}>
                      <Text style={[styles.dayTimelineCardTitle, entry.locked ? styles.dayTimelineCardTitleLocked : null]}>{`Day ${entry.dayNumber}`}</Text>
                      <Text style={styles.dayTimelineCardMeta}>{`${entry.minutes} mins | ${entry.calories} kcal`}</Text>
                      <Text style={styles.dayTimelineCardSubMeta}>{`${entry.workoutTypeLabel} • ${DIFFICULTY_LABELS[entry.difficultyTier]}`}</Text>
                    </View>
                  </View>
                  {entry.active && !entry.locked ? (
                    <Pressable onPress={onContinue} style={styles.dayStartButton}>
                      <Text style={styles.dayStartButtonText}>Start Now</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              </View>
              </Animated.View>
            );
          })}
          </Animated.View>
        </AppScroll>
      </View>
    );
  }

  // ─── WorkoutTypeScreen ────────────────────────────────────────────────────────

  function WorkoutTypeScreen({ workoutPlan, setWorkoutPlan, onBack, onContinue }) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const scaleAnims = useRef(WORKOUT_TYPES.map((t) => new Animated.Value(t.id === workoutPlan.workoutType ? 1.1 : 0.88))).current;
    const floatAnims = useRef(WORKOUT_TYPES.map(() => new Animated.Value(0))).current;
    const floatLoopRef = useRef(null);

    useEffect(() => {
      const activeIdxRaw = WORKOUT_TYPES.findIndex((t) => t.id === workoutPlan.workoutType);
      const activeIdx = activeIdxRaw >= 0 ? activeIdxRaw : 0;
      if (floatLoopRef.current) floatLoopRef.current.stop();
      Animated.parallel([
        ...WORKOUT_TYPES.map((_, i) => Animated.spring(scaleAnims[i], { toValue: i === activeIdx ? 1.1 : 0.88, friction: 5, tension: 130, useNativeDriver: true })),
        ...WORKOUT_TYPES.map((_, i) => Animated.timing(floatAnims[i], { toValue: 0, duration: 180, useNativeDriver: true })),
      ]).start(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnims[activeIdx], { toValue: -10, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(floatAnims[activeIdx], { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        );
        floatLoopRef.current = loop;
        loop.start();
      });
      return () => { if (floatLoopRef.current) floatLoopRef.current.stop(); };
    }, [workoutPlan.workoutType]);

    function cycleType(direction) {
      setWorkoutPlan((prev) => {
        const idx = Math.max(0, WORKOUT_TYPES.findIndex((t) => t.id === prev.workoutType));
        const next = (idx + direction + WORKOUT_TYPES.length) % WORKOUT_TYPES.length;
        return { ...prev, workoutType: WORKOUT_TYPES[next].id, exerciseIds: [] };
      });
    }

    function handleTypePress(typeId) {
      if (workoutPlan.workoutType === typeId) { onContinue(); return; }
      setWorkoutPlan((prev) => ({ ...prev, workoutType: typeId, exerciseIds: [] }));
    }

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          const dir = g.dx < -40 ? 1 : g.dx > 40 ? -1 : 0;
          if (dir === 0) return;
          cycleType(dir);
        },
      })
    ).current;

    return (
      <View style={styles.workoutSelectScreen} {...panResponder.panHandlers}>
        <Image source={WORKOUT_BG_SOURCE} style={[styles.workoutSelectBg, { width: windowWidth, height: windowHeight }]} resizeMode="cover" fadeDuration={0} />
        <View style={[styles.workoutSelectOverlay, { width: windowWidth, height: windowHeight }]} />
        <Pressable onPress={onBack} style={styles.workoutTopBackButton}>
          <Text style={styles.workoutTopBackButtonText}>{"<"}</Text>
        </Pressable>
        <View style={styles.workoutSelectContent}>
          <Text style={styles.workoutChooseTitle}>{"CHOOSE YOUR\nWORKOUT"}</Text>
          <Text style={styles.workoutSelectOneLabel}>SELECT ONE</Text>
          <View style={styles.workoutCardsRow}>
            <Pressable onPress={() => cycleType(-1)} style={styles.workoutArrowBtn}>
              <Text style={styles.workoutArrowText}>{"<"}</Text>
            </Pressable>
            {WORKOUT_TYPES.map((type, i) => {
              const active = workoutPlan.workoutType === type.id;
              return (
                <Animated.View key={type.id} style={[styles.workoutTypeCardWrap, { transform: [{ scale: scaleAnims[i] }, { translateY: floatAnims[i] }] }]}>
                  <Pressable onPress={() => handleTypePress(type.id)} style={[styles.workoutTypeCard, active ? styles.workoutTypeCardActive : styles.workoutTypeCardInactive]}>
                    <Image source={type.iconUri} style={[styles.workoutTypeCardIcon, active ? null : styles.workoutTypeCardIconInactive]} resizeMode="contain" />
                  </Pressable>
                </Animated.View>
              );
            })}
            <Pressable onPress={() => cycleType(1)} style={styles.workoutArrowBtn}>
              <Text style={styles.workoutArrowText}>{">"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ─── ExerciseSelectionScreen ──────────────────────────────────────────────────

  function ExerciseSelectionScreen({ workoutPlan, setWorkoutPlan, onBack, onContinue }) {
    const filteredExercises = EXERCISES.filter((e) => e.type === workoutPlan.workoutType);
    const canContinue = workoutPlan.exerciseIds.length > 0;
    const selectedType = WORKOUT_TYPES.find((t) => t.id === workoutPlan.workoutType);

    function toggleExercise(id) {
      setWorkoutPlan((prev) => ({
        ...prev,
        exerciseIds: prev.exerciseIds.includes(id)
          ? prev.exerciseIds.filter((item) => item !== id)
          : [...prev.exerciseIds, id],
      }));
    }

    return (
      <AppScroll>
        <Text style={styles.screenTitle}>Physical Path</Text>
        <Text style={styles.screenSubtitle}>Select exercises based on the category you chose.</Text>
        <View style={styles.selectionSummaryCard}>
          <Text style={styles.selectionSummaryEyebrow}>Selected Category</Text>
          <Text style={styles.selectionSummaryTitle}>{selectedType ? selectedType.label : "Workout"}</Text>
          <Text style={styles.selectionSummaryText}>{selectedType ? selectedType.subtitle : "Choose your preferred training format."}</Text>
        </View>
        {filteredExercises.map((exercise) => {
          const active = workoutPlan.exerciseIds.includes(exercise.id);
          return (
            <Pressable key={exercise.id} onPress={() => toggleExercise(exercise.id)} style={[styles.exercisePickCard, active ? styles.exercisePickCardActive : null]}>
              <View style={styles.exercisePickMain}>
                <Text style={[styles.choiceTitle, active ? styles.choiceTitleActive : null]}>{exercise.name}</Text>
                <Text style={styles.choiceSubtitle}>{`${exercise.durationSec}s • ${exercise.description}`}</Text>
              </View>
              <Text style={styles.selectedMark}>{active ? "✓" : "Tap"}</Text>
            </Pressable>
          );
        })}
        <View style={styles.inlineButtons}>
          <PrimaryButton label="Back" onPress={onBack} style={styles.inlineButton} />
          <PrimaryButton label="Next: Academic Path" onPress={onContinue} disabled={!canContinue} style={styles.inlineButton} />
        </View>
      </AppScroll>
    );
  }

  // ─── TopicSelectionScreen ─────────────────────────────────────────────────────

  function TopicSelectionScreen({ workoutPlan, setWorkoutPlan, onBack, onContinue }) {
    const difficultyLabel = DIFFICULTY_LABELS[clamp(workoutPlan.difficultyTier || 1, 1, 3)] || DIFFICULTY_LABELS[1];
    const topicEntries = useMemo(() => Object.entries(TOPICS), []);
    const scaleAnims = useRef(topicEntries.map(([key]) => new Animated.Value(workoutPlan.topicKey === key ? 1.02 : 0.97))).current;
    const liftAnims = useRef(topicEntries.map(() => new Animated.Value(0))).current;

    useEffect(() => {
      const activeIdxRaw = topicEntries.findIndex(([key]) => key === workoutPlan.topicKey);
      const activeIdx = activeIdxRaw >= 0 ? activeIdxRaw : 0;
      Animated.parallel([
        ...topicEntries.map((_, i) => Animated.spring(scaleAnims[i], { toValue: i === activeIdx ? 1.02 : 0.97, friction: 6, tension: 120, useNativeDriver: true })),
        ...topicEntries.map((_, i) => Animated.timing(liftAnims[i], { toValue: i === activeIdx ? -6 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
      ]).start();
    }, [workoutPlan.topicKey, topicEntries, scaleAnims, liftAnims]);

    function handleTopicPress(topicKey) {
      if (workoutPlan.topicKey === topicKey) { onContinue(); return; }
      setWorkoutPlan((p) => ({ ...p, topicKey }));
    }

    return (
      <AppScroll>
        <Pressable onPress={onBack} style={styles.dayTopBackButton}>
          <Text style={styles.dayTopBackButtonText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.dayPlanOverline}>{`DAY ${workoutPlan.dayNumber || 1}`}</Text>
        <Text style={styles.dayPlanTitle}>ACADEMIC PATH</Text>
        <Text style={styles.dayPlanSubtitle}>{`${difficultyLabel} challenge. Tap a topic card to select it, then tap Start Active Session.`}</Text>
        <View style={styles.selectionSummaryCard}>
          <Text style={styles.selectionSummaryEyebrow}>Learning Difficulty</Text>
          <Text style={styles.selectionSummaryTitle}>{difficultyLabel}</Text>
          <Text style={styles.selectionSummaryText}>Choose the topic you want to study during this workout session.</Text>
        </View>
        {topicEntries.map(([key, topic], index) => {
          const active = workoutPlan.topicKey === key;
          const meta = TOPIC_CARD_META[key] || TOPIC_CARD_META.programming;
          return (
            <Animated.View key={key} style={{ transform: [{ scale: scaleAnims[index] }, { translateY: liftAnims[index] }] }}>
              <View style={[styles.choiceCard, active ? styles.choiceCardActive : null]}>
                <Pressable onPress={() => handleTopicPress(key)} style={styles.topicCardPressArea}>
                  <View style={styles.topicCardTopRow}>
                    <View style={styles.topicCardTextWrap}>
                      <Text style={[styles.choiceTitle, active ? styles.choiceTitleActive : null]}>{topic.name}</Text>
                      <Text style={styles.choiceSubtitle}>{`${topic.questions.length} quiz items • ${meta.label}`}</Text>
                    </View>
                  </View>
                </Pressable>
                {active ? <PrimaryButton label="Start Active Session" onPress={onContinue} style={styles.topicStartButton} textStyle={styles.topicStartButtonText} /> : null}
              </View>
            </Animated.View>
          );
        })}
      </AppScroll>
    );
  }

  // ─── ActiveSessionScreen ──────────────────────────────────────────────────────

  function ActiveSessionScreen({ workoutPlan, onCancel, onComplete }) {
    const prefersMp4 = Platform.OS === "android";
    const selectedExercises = useMemo(() => workoutPlan.exerciseIds.map((id) => EXERCISES.find((e) => e.id === id)).filter(Boolean), [workoutPlan.exerciseIds]);
    const [session, setSession] = useState(() => ({ exerciseIndex: 0, remainingSec: selectedExercises[0]?.durationSec || 0, paused: false, elapsedSec: 0, calories: 0, completed: 0, finished: false }));
    const [mediaFailed, setMediaFailed] = useState(false);
    const [useFallbackSource, setUseFallbackSource] = useState(prefersMp4);
    const finishSentRef = useRef(false);
    const current = selectedExercises.length ? selectedExercises[Math.min(session.exerciseIndex, selectedExercises.length - 1)] : null;
    const progress = selectedExercises.length ? Math.round((session.completed / selectedExercises.length) * 100) : 0;
    const mediaSource = current ? (useFallbackSource && current.fallbackSource ? current.fallbackSource : current.mediaSource || current.fallbackSource || { uri: current.mediaUri }) : null;
    const videoRef = useRef(null);

    useEffect(() => {
      finishSentRef.current = false;
      setMediaFailed(false);
      setUseFallbackSource(prefersMp4);
      setSession({ exerciseIndex: 0, remainingSec: selectedExercises[0]?.durationSec || 0, paused: false, elapsedSec: 0, calories: 0, completed: 0, finished: false });
    }, [selectedExercises, prefersMp4]);

    useEffect(() => {
      if (!selectedExercises.length || session.finished) return undefined;
      const timer = setInterval(() => {
        setSession((prev) => {
          if (prev.paused || prev.finished) return prev;
          const curr = selectedExercises[Math.min(prev.exerciseIndex, selectedExercises.length - 1)];
          const caloriesPerSecond = (curr?.caloriesPerMinute || 8) / 60;
          const nextRemaining = prev.remainingSec - 1;
          if (nextRemaining > 0) return { ...prev, remainingSec: nextRemaining, elapsedSec: prev.elapsedSec + 1, calories: prev.calories + caloriesPerSecond };
          const nextIndex = prev.exerciseIndex + 1;
          if (nextIndex >= selectedExercises.length) return { ...prev, remainingSec: 0, exerciseIndex: nextIndex, completed: prev.completed + 1, elapsedSec: prev.elapsedSec + 1, calories: prev.calories + caloriesPerSecond, finished: true };
          return { ...prev, exerciseIndex: nextIndex, remainingSec: selectedExercises[nextIndex].durationSec, completed: prev.completed + 1, elapsedSec: prev.elapsedSec + 1, calories: prev.calories + caloriesPerSecond };
        });
      }, 1000);
      return () => clearInterval(timer);
    }, [selectedExercises, session.finished]);

    useEffect(() => {
      if (!session.finished || finishSentRef.current) return;
      finishSentRef.current = true;
      const activeMinutes = Math.max(1, Math.round(session.elapsedSec / 60));
      const estimatedSteps = selectedExercises.length * 850 + Math.round(session.elapsedSec * 1.9);
      onComplete({ exerciseCount: selectedExercises.length, elapsedSec: session.elapsedSec, calories: Math.round(session.calories), activeMinutes, steps: estimatedSteps, workoutType: workoutPlan.workoutType, topicKey: workoutPlan.topicKey, dayNumber: workoutPlan.dayNumber, difficultyTier: workoutPlan.difficultyTier, plannedQuestionCount: workoutPlan.plannedQuestionCount, exerciseIds: workoutPlan.exerciseIds });
    }, [session, selectedExercises.length, workoutPlan.topicKey, workoutPlan.workoutType, workoutPlan.dayNumber, workoutPlan.difficultyTier, workoutPlan.plannedQuestionCount, workoutPlan.exerciseIds, onComplete]);

    useEffect(() => {
      if (!current) return;
      setMediaFailed(false);
      setUseFallbackSource(prefersMp4);
    }, [current?.id, prefersMp4]);

    function togglePause() { setSession((p) => ({ ...p, paused: !p.paused })); }
    function skipExercise() {
      setSession((prev) => {
        if (prev.finished) return prev;
        const nextIndex = prev.exerciseIndex + 1;
        if (nextIndex >= selectedExercises.length) return { ...prev, exerciseIndex: nextIndex, remainingSec: 0, completed: prev.completed + 1, finished: true };
        return { ...prev, exerciseIndex: nextIndex, remainingSec: selectedExercises[nextIndex].durationSec, completed: prev.completed + 1 };
      });
    }

    if (!selectedExercises.length) {
      return <AppScroll><Text style={styles.screenTitle}>No exercises selected</Text><PrimaryButton label="Back to Setup" onPress={onCancel} /></AppScroll>;
    }

    return (
      <AppScroll>
        <Text style={styles.screenTitle}>Active Session</Text>
        <Text style={styles.screenSubtitle}>Exercise card with timer and controls for play, pause, and skip.</Text>
        <View style={styles.sessionMetaRow}>
          <Text style={styles.metaBadge}>{`Progress ${progress}%`}</Text>
          <Text style={styles.metaBadge}>{`Time ${formatTime(session.elapsedSec)}`}</Text>
          <Text style={styles.metaBadge}>{`Calories ${Math.round(session.calories)}`}</Text>
        </View>
        <View style={styles.sessionCard}>
          <Text style={styles.sessionExerciseTitle}>{current?.name || "Exercise"}</Text>
          <Text style={styles.sessionExerciseSubtitle}>{current?.description || ""}</Text>
          {mediaSource && !mediaFailed ? (
            <ExerciseMedia
              source={mediaSource}
              fallbackSource={current?.fallbackSource}
              style={[styles.exerciseMedia, current?.id === "jumping-jacks" ? styles.exerciseMediaJumpingJacks : null, current?.id === "mountain-climbers" ? styles.exerciseMediaMountainClimbers : null]}
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <View style={styles.mediaFallback}><Text style={styles.mediaFallbackText}>Exercise media unavailable</Text></View>
          )}
          <View style={styles.timerWrap}>
            <Text style={styles.timerValue}>{session.remainingSec}</Text>
            <Text style={styles.timerLabel}>seconds remaining</Text>
          </View>
          <View style={styles.controlRow}>
            <PrimaryButton label={session.paused ? "Play" : "Pause"} onPress={togglePause} style={styles.controlButton} />
            <PrimaryButton label="Skip" onPress={skipExercise} style={styles.controlButton} />
            <PrimaryButton label="Stop" onPress={onCancel} style={styles.controlButtonDanger} textStyle={styles.controlButtonDangerText} />
          </View>
        </View>
      </AppScroll>
    );
  }

  // ─── QuizScreen ───────────────────────────────────────────────────────────────

  function QuizScreen({ topicKey, questionCount, difficultyTier = 1, onComplete, onCancel }) {
    const questions = useMemo(() => {
      const bank = TOPICS[topicKey]?.questions || [];
      const normalizedBank = bank.map((q, i) => ({ ...q, difficulty: q.difficulty || (i <= 1 ? 1 : i === 2 ? 2 : 3) }));
      const requestedCount = Math.max(1, questionCount || 1);
      let candidateBank = normalizedBank.filter((q) => q.difficulty <= difficultyTier);
      if (candidateBank.length < requestedCount) candidateBank = normalizedBank.filter((q) => q.difficulty <= difficultyTier + 1);
      if (!candidateBank.length) candidateBank = normalizedBank;
      const maxCount = Math.max(1, Math.min(requestedCount, candidateBank.length));
      return shuffle(candidateBank).slice(0, maxCount);
    }, [questionCount, topicKey, difficultyTier]);

    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [voiceCommand, setVoiceCommand] = useState("");
    const current = questions[index] || null;
    const letters = ["A", "B", "C", "D"];
    const difficultyLabel = DIFFICULTY_LABELS[clamp(difficultyTier, 1, 3)] || DIFFICULTY_LABELS[1];

    function speakQuestion() {
      if (!current) return;
      const optionsText = current.options.map((o, i) => `${letters[i]}. ${o}`).join(". ");
      Speech.stop();
      Speech.speak(`Question ${index + 1}. ${current.prompt}. ${optionsText}.`, { rate: 0.95, pitch: 1 });
    }
    useEffect(() => { speakQuestion(); return () => { Speech.stop(); }; }, [index]);

    function handleAnswer(choiceIndex, source) {
      if (!current || feedback) return;
      const correct = choiceIndex === current.correct;
      const nextAnswers = [...answers, { prompt: current.prompt, selected: choiceIndex, correct, correctIndex: current.correct, source }];
      setFeedback({ selected: choiceIndex, correct, correctIndex: current.correct });
      setAnswers(nextAnswers);
      setTimeout(() => {
        const isLast = index + 1 >= questions.length;
        if (isLast) { onComplete({ total: questions.length, correct: nextAnswers.filter((e) => e.correct).length, answers: nextAnswers }); return; }
        setFeedback(null);
        setVoiceCommand("");
        setIndex((v) => v + 1);
      }, 700);
    }

    function submitVoiceCommand() {
      const normalized = voiceCommand.trim().toUpperCase();
      const indexByLetter = { A: 0, B: 1, C: 2, D: 3 };
      const choice = indexByLetter[normalized];
      if (choice === undefined || choice >= (current?.options.length || 0)) { Alert.alert("Invalid command", "Use A, B, or C for this quiz item."); return; }
      handleAnswer(choice, "voice");
    }

    if (!current) {
      return <AppScroll><Text style={styles.screenTitle}>Quiz unavailable</Text><PrimaryButton label="Back to Dashboard" onPress={onCancel} /></AppScroll>;
    }

    return (
      <AppScroll>
        <Text style={styles.screenTitle}>IT Quiz</Text>
        <Text style={styles.screenSubtitle}>{`Difficulty ${difficultyLabel}: answer correctly to earn more XP.`}</Text>
        <View style={styles.quizHeaderRow}>
          <Text style={styles.quizCounter}>{`Question ${index + 1} of ${questions.length}`}</Text>
          <PrimaryButton label="🔊 Replay" onPress={speakQuestion} style={styles.audioButton} textStyle={styles.audioButtonText} />
        </View>
        <View style={styles.quizCard}>
          <Text style={styles.quizPrompt}>{current.prompt}</Text>
          {current.options.map((option, optionIndex) => {
            let rowStyle = styles.answerRow;
            let textStyle = styles.answerText;
            if (feedback) {
              if (optionIndex === feedback.correctIndex) { rowStyle = [styles.answerRow, styles.answerRowCorrect]; textStyle = [styles.answerText, styles.answerTextCorrect]; }
              else if (optionIndex === feedback.selected && !feedback.correct) { rowStyle = [styles.answerRow, styles.answerRowWrong]; textStyle = [styles.answerText, styles.answerTextWrong]; }
            }
            return (
              <Pressable key={`${option}-${optionIndex}`} onPress={() => handleAnswer(optionIndex, "touch")} disabled={Boolean(feedback)} style={rowStyle}>
                <Text style={styles.answerLetter}>{letters[optionIndex]}</Text>
                <Text style={textStyle}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.voiceBox}>
          <Text style={styles.voiceTitle}>Hands-Free Mode</Text>
          <Text style={styles.voiceHelp}>Say A, B, or C and enter the recognized letter below.</Text>
          <TextInput value={voiceCommand} onChangeText={(v) => setVoiceCommand(v.toUpperCase())} placeholder="A / B / C" placeholderTextColor={COLORS.textMuted} maxLength={1} autoCapitalize="characters" style={styles.voiceInput} />
          <PrimaryButton label="Submit Voice Command" onPress={submitVoiceCommand} disabled={Boolean(feedback)} />
        </View>
      </AppScroll>
    );
  }

// ─── SummaryScreen ────────────────────────────────────────────────────────────

function SummaryScreen({ summary, onReturnHome, onRepeat }) {
  const levelBefore = getLevelInfo(summary.previousPoints);
  const levelAfter = getLevelInfo(summary.updatedPoints);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const leveledUp = levelAfter.level > levelBefore.level;

  useEffect(() => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, { toValue: levelAfter.percent, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [animatedProgress, levelAfter.percent]);

  const animatedWidth = animatedProgress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <AppScroll>
      <Text style={styles.screenTitle}>Session Complete! 🎉</Text>
      <Text style={styles.screenSubtitle}>Post-workout results and XP earned.</Text>

      {/* Points breakdown card */}
      <View style={styles.summaryPointsCard}>
        <Text style={styles.summaryPointsTotal}>{`+${summary.totalPoints} XP`}</Text>
        <View style={styles.summaryPointsBreakdown}>
          <Text style={styles.summaryPointLine}>{`💪 Exercise   +${summary.exercisePoints}`}</Text>
          <Text style={styles.summaryPointLine}>{`🧠 Quiz       +${summary.quizPoints}`}</Text>
          <Text style={styles.summaryPointLine}>{`⏱ Activity   +${summary.consistencyPoints}`}</Text>
          {summary.perfectBonus > 0 && <Text style={styles.summaryPointBonus}>{`🎯 Perfect quiz!  +${summary.perfectBonus}`}</Text>}
          {summary.streakBonus > 0 && <Text style={styles.summaryPointBonus}>{`🔥 Streak ×${summary.streakMultiplier?.toFixed(2)}  +${summary.streakBonus}`}</Text>}
          {summary.achievementBonus > 0 && <Text style={styles.summaryPointBonus}>{`🏆 New achievements!  +${summary.achievementBonus}`}</Text>}
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statGrid}>
        <StatCard label="Calories" value={summary.session.calories} accent={COLORS.warning} />
        <StatCard label="Quiz Score" value={`${summary.quiz.correct}/${summary.quiz.total}`} accent={COLORS.xp} />
      </View>

      {/* Level progress */}
      <View style={styles.summaryLevelCard}>
        {leveledUp && (
          <View style={styles.levelUpBanner}>
            <Text style={styles.levelUpText}>{`⭐ LEVEL UP! → Level ${levelAfter.level} ${levelAfter.name}`}</Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>XP Progress</Text>
        <Text style={styles.progressLine}>{`Level ${levelBefore.level} ${levelBefore.name}  →  Level ${levelAfter.level} ${levelAfter.name}`}</Text>
        <View style={styles.levelTrack}>
          <Animated.View style={[styles.levelFill, { width: animatedWidth }]} />
        </View>
        <Text style={styles.levelHint}>{`Total XP: ${summary.updatedPoints}`}</Text>
      </View>

      {/* Streak info */}
      {summary.newStreak > 0 && (
        <View style={styles.summaryStreakCard}>
          <Text style={styles.summaryStreakText}>{`🔥 ${summary.newStreak}-day streak${summary.newStreak >= 3 ? " — Bonus XP activated!" : ""}`}</Text>
        </View>
      )}

      {/* Newly unlocked achievements */}
      {summary.newlyUnlocked && summary.newlyUnlocked.length > 0 && (
        <View style={styles.summaryAchCard}>
          <Text style={styles.summaryAchTitle}>Achievements Unlocked!</Text>
          {summary.newlyUnlocked.map((id) => {
            const ach = ACHIEVEMENTS.find((a) => a.id === id);
            if (!ach) return null;
            return (
              <View key={id} style={styles.summaryAchRow}>
                <Text style={styles.summaryAchIcon}>{ach.icon}</Text>
                <View>
                  <Text style={styles.summaryAchName}>{ach.name}</Text>
                  <Text style={styles.summaryAchDesc}>{ach.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <PrimaryButton label="Back to Dashboard" onPress={onReturnHome} />
      <PrimaryButton label="Start Another Workout" onPress={onRepeat} style={styles.secondaryButton} textStyle={styles.secondaryButtonText} />
    </AppScroll>
  );
}

// ─── ProgressScreen ───────────────────────────────────────────────────────────

function ProgressScreen({ stats, onBack }) {
  const level = getLevelInfo(stats.points);
  const quizAccuracy = stats.quizAnswered > 0
    ? Math.round((stats.quizCorrect / stats.quizAnswered) * 100) : 0;
  const unlockedAchs = stats.unlockedAchievements || [];

  return (
    <AppScroll>
      <Pressable onPress={onBack} style={styles.dayTopBackButton}>
        <Text style={styles.dayTopBackButtonText}>{"<"}</Text>
      </Pressable>
      <Text style={styles.screenTitle}>Progress Overview</Text>
      <Text style={styles.screenSubtitle}>Your level, XP, streaks, and achievement history.</Text>

      {/* Level card */}
      <View style={styles.progressLevelCard}>
        <Text style={styles.progressLevelTitle}>{`Level ${level.level} — ${level.name}`}</Text>
        <XPBar points={stats.points} />
        <View style={styles.progressMiniStatsRow}>
          <View style={styles.progressMiniStat}>
            <Text style={styles.progressMiniStatValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.progressMiniStatLabel}>Workouts</Text>
          </View>
          <View style={styles.progressMiniStat}>
            <Text style={styles.progressMiniStatValue}>{stats.totalExercises}</Text>
            <Text style={styles.progressMiniStatLabel}>Exercises</Text>
          </View>
          <View style={styles.progressMiniStat}>
            <Text style={[styles.progressMiniStatValue, { color: COLORS.streak }]}>{stats.currentStreak || 0}</Text>
            <Text style={styles.progressMiniStatLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.progressMiniStat}>
            <Text style={[styles.progressMiniStatValue, { color: COLORS.warning }]}>{stats.longestStreak || 0}</Text>
            <Text style={styles.progressMiniStatLabel}>Best Streak</Text>
          </View>
        </View>
      </View>

      {/* Quiz stats */}
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Quiz Performance</Text>
        <View style={styles.statGrid}>
          <StatCard label="Questions" value={stats.quizAnswered} />
          <StatCard label="Correct" value={stats.quizCorrect} accent={COLORS.success} />
          <StatCard label="Accuracy" value={`${quizAccuracy}%`} accent={COLORS.xp} />
          <StatCard label="Total XP" value={stats.points} accent={COLORS.primary} />
        </View>
      </View>

      {/* Achievement wall */}
      <Text style={styles.sectionTitle}>{`Achievements  ${unlockedAchs.length}/${ACHIEVEMENTS.length}`}</Text>
      <View style={styles.achWall}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = unlockedAchs.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achWallCard, unlocked ? styles.achWallCardUnlocked : null]}>
              <Text style={styles.achWallIcon}>{unlocked ? ach.icon : "🔒"}</Text>
              <Text style={[styles.achWallName, unlocked ? styles.achWallNameUnlocked : null]}>{ach.name}</Text>
              <Text style={styles.achWallDesc}>{ach.desc}</Text>
            </View>
          );
        })}
      </View>
    </AppScroll>
  );
}

  // ─── ArmoryModal ──────────────────────────────────────────────────────────────

  function ArmoryModal({ visible, onClose, points, inventory, setInventory, setProfile }) {
    const [activeCategory, setActiveCategory] = useState("consumable");

    const categories = [
      { id: "consumable",  label: "🧪 Consumables" },
      { id: "skin",        label: "🎨 Themes" },
      { id: "stat_boost",  label: "⭐ Boosts" },
      { id: "gear",        label: "🏋️ Gear" },
    ];

    // Map "gear" category to items that are stat boosts but feel like equipment
    const gearIds = ["gym_gloves", "running_shoes", "water_bottle"];
    const boostIds = ["xp_chip_s", "xp_chip_m", "xp_chip_l", "cal_chip", "cal_chip_ii"];

    function getItemCategory(item) {
      if (gearIds.includes(item.id)) return "gear";
      if (boostIds.includes(item.id)) return "stat_boost";
      return item.type;
    }

    const filteredItems = SHOP_ITEMS.filter(item => getItemCategory(item) === activeCategory);

    const handlePurchase = (item) => {
      if (points < item.price) { Alert.alert("Not enough XP", "Complete more workouts to earn XP!"); return; }
      const owned = (inventory.items || {})[item.id];
      if (owned && item.type !== "consumable") { Alert.alert("Already owned", "You already have this item!"); return; }
      Alert.alert(`Buy ${item.name}?`, `Spend ${item.price} XP for: ${item.description}`, [
        { text: "Cancel" },
        { text: "Buy!", onPress: () => {
          setInventory((prev) => {
            const newItems = { ...prev.items };
            if (item.type === "consumable") { newItems[item.id] = (newItems[item.id] || 0) + 1; }
            else { newItems[item.id] = 1; }
            return { ...prev, items: newItems };
          });
          if (item.type === "skin") { setProfile((p) => ({ ...p, accentColor: item.color })); }
          Alert.alert("Unlocked! 🎉", `You got ${item.emoji} ${item.name}!`);
        }},
      ]);
    };

    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.armoryContainer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.armoryTitle}>The Armory 🛒</Text>
              <Text style={styles.pointsText}>{`${points} XP`}</Text>
            </View>

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map(cat => (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, borderRadius: 12,
                    borderWidth: 1,
                    borderColor: activeCategory === cat.id ? COLORS.primaryLight : COLORS.border,
                    backgroundColor: activeCategory === cat.id ? "#2e1d4a" : COLORS.panelAlt,
                  }}
                >
                  <Text style={{ color: activeCategory === cat.id ? COLORS.primaryLight : COLORS.textMuted, fontWeight: "800", fontSize: 12 }}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {filteredItems.map((item) => {
                const owned = (inventory.items || {})[item.id];
                const isOwned = owned && item.type !== "consumable";
                const qty = item.type === "consumable" ? (owned || 0) : null;
                return (
                  <Pressable key={item.id} style={[styles.shopItem, isOwned && { opacity: 0.6, borderColor: COLORS.success }]} onPress={() => handlePurchase(item)}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#1a1030", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                      {qty > 0 && <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: "800", marginTop: 2 }}>{`Owned: ${qty}`}</Text>}
                      {isOwned && <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: "800", marginTop: 2 }}>✓ Owned</Text>}
                    </View>
                    <Text style={[styles.itemPrice, isOwned && { color: COLORS.success }]}>
                      {isOwned ? "✓" : `${item.price} XP`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <PrimaryButton label="Close Armory" onPress={onClose} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Main App ─────────────────────────────────────────────────────────────────

  export default function FitQuestApp() {

    const [route, setRoute] = useState("player_setup");
    const [armoryVisible, setArmoryVisible] = useState(false);
    const [inventory, setInventory] = useState({ items: {} });
    const [character, setCharacter] = useState(INITIAL_CHARACTER);

    // Default values
    const defaultProfile = {
      displayName: "",
      age: "",
      gender: "",
      weight: "",
      height: "",
      goal: "",
      knowledgeLevel: "",
      programDays: "30",
      accentColor: null,
    };
    const defaultStats = {
      points: 0,
      totalWorkouts: 0,
      totalExercises: 0,
      quizCorrect: 0,
      quizAnswered: 0,
      completedDays: [],
      dayCompletionDates: {},
      exerciseHistory: {},
      workoutTypeHistory: {},
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      unlockedAchievements: [],
      totalCalories: 0,
      today: { steps: 0, calories: 0, activeMinutes: 0 },
    };

    const [profile, setProfile] = useState(defaultProfile);
    const [stats, setStats] = useState(defaultStats);


    // Load local progress on mount and skip onboarding if username and goal exist
    useEffect(() => {
      (async () => {
        const saved = await loadLocalProgress();
        if (saved) {
          if (saved.profile) setProfile((p) => ({ ...p, ...saved.profile }));
          if (saved.stats) setStats((s) => ({ ...s, ...saved.stats }));
          // If username and goal exist, skip onboarding
          if (saved.profile && saved.profile.displayName && saved.profile.goal) {
            setRoute("dashboard");
          }
        }
      })();
    }, []);

    // Save local progress when profile or stats change
    useEffect(() => {
      saveLocalProgress({ profile, stats });
    }, [profile, stats]);

    const [workoutPlan, setWorkoutPlan] = useState({
      dayNumber: 1,
      difficultyTier: 1,
      workoutType: "cardio",
      exerciseIds: [],
      plannedQuestionCount: 3,
      topicKey: "programming",
    });

    const [sessionResult, setSessionResult] = useState(null);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
      [DASHBOARD_BG_SOURCE, DAY_SELECT_BG_SOURCE, WORKOUT_BG_SOURCE].forEach((source) => {
        Asset.fromModule(source).downloadAsync().catch(() => {});
      });
    }, []);

    function handlePlayerStart() {
      if (!profile.displayName.trim() || profile.displayName.trim().length < 2) {
        Alert.alert("Invalid name", "Please enter a name with at least 2 characters.");
        return;
      }
      if (!profile.goal) {
        Alert.alert("Choose a goal", "Please select your fitness goal.");
        return;
      }
      // Set default programDays if not set
      if (!profile.programDays || !parsePositiveNumber(profile.programDays)) {
        setProfile((p) => ({ ...p, programDays: "30" }));
      }
      setRoute("dashboard");
    }

    function startWorkoutFlow() {
      const totalDays = getProgramDays(profile.programDays);
      const unlockedDay = getNextUnlockedDay(stats.completedDays, totalDays);
      setWorkoutPlan((p) => ({ ...p, dayNumber: unlockedDay, exerciseIds: [] }));
      setRoute("day_select");
    }

    function confirmDaySelection() {
      const totalDays = getProgramDays(profile.programDays);
      const unlockedDay = getNextUnlockedDay(stats.completedDays, totalDays);
      const selectedDay = clamp(workoutPlan.dayNumber || 1, 1, totalDays);
      const isCompleted = (stats.completedDays || []).includes(selectedDay);

      // Enforce real-date lock: next new day cannot start on the same calendar day
      // that the previous day was finished.
      if (selectedDay === unlockedDay && !isCompleted) {
        if (isNextDayLockedUntilTomorrow(stats.completedDays, stats.dayCompletionDates, totalDays)) {
          Alert.alert(
            "Come back tomorrow! 📅",
            `Day ${unlockedDay} is locked until tomorrow.\nYou've already completed a day today — rest up and return tomorrow!`,
          );
          return;
        }
      }

      if (selectedDay > unlockedDay && !isCompleted) { Alert.alert("Day locked", `Complete Day ${unlockedDay} first.`); return; }
      const userLevel = getLevelInfo(stats.points).level;
      const planned = buildDayWorkoutPlan({ dayNumber: selectedDay, totalDays, userLevel, exerciseHistory: stats.exerciseHistory, currentTopicKey: workoutPlan.topicKey });
      setWorkoutPlan((p) => ({ ...p, ...planned }));
      setRoute("topic_select");
    }

    function goToExerciseSelection() {
      setWorkoutPlan((p) => ({ ...p, exerciseIds: [] }));
      setRoute("exercise_select");
    }

    function goToTopicSelection() {
      if (workoutPlan.exerciseIds.length === 0) { Alert.alert("No exercises selected", "Choose at least one exercise first."); return; }
      setRoute("topic_select");
    }

    function startSession() {
      if (!workoutPlan.exerciseIds.length) { Alert.alert("Day plan missing", "Select an unlocked day first."); return; }
      if (!workoutPlan.topicKey) { Alert.alert("No topic selected", "Choose an IT topic before starting."); return; }
      setSessionResult(null);
      setRoute("session");
    }

    function handleSessionComplete(result) {
      setSessionResult(result);
      setRoute("quiz");
    }

    function handleQuizComplete(quizResult) {
      if (!sessionResult) return;

      const today = getDateKey();

      setStats((prev) => {
        // ── Streak calculation
        let newStreak = 1;
        if (prev.lastWorkoutDate) {
          if (prev.lastWorkoutDate === today) {
            newStreak = prev.currentStreak; // same day — keep streak
          } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (prev.lastWorkoutDate === getDateKey(yesterday)) {
              newStreak = prev.currentStreak + 1; // consecutive day
            }
            // else: missed a day — check streak shield
            else {
              const shield = (character.stats || {}).streakShield || 0;
              if (shield > 0) {
                newStreak = prev.currentStreak; // shield absorbs the miss
                setCharacter((c) => ({ ...c, stats: { ...(c.stats || {}), streakShield: Math.max(0, shield - 1) } }));
              }
            }
          }
        }

        // ── Bonus multiplier from streak
        const streakMultiplier = newStreak >= 7 ? 1.5 : newStreak >= 3 ? 1.25 : 1;

        // ── Points (with character xpBoost)
        const xpBoostMult = 1 + ((character.stats || {}).xpBoost || 0);
        const calBoostMult = 1 + ((character.stats || {}).calBoost || 0);
        const boostedCalories = Math.round(sessionResult.calories * calBoostMult);
        const exercisePoints = Math.round((sessionResult.exerciseCount * 40 + Math.round(boostedCalories * 0.5)) * xpBoostMult);
        const quizPoints = Math.round(quizResult.correct * 30 * xpBoostMult);
        const consistencyPoints = Math.round(sessionResult.activeMinutes * 8 * xpBoostMult);
        const perfectBonus = (quizResult.correct === quizResult.total && quizResult.total > 0) ? 50 : 0;
        const base = exercisePoints + quizPoints + consistencyPoints + perfectBonus;
        const streakBonus = Math.round(base * (streakMultiplier - 1));
        const totalPoints = base + streakBonus;

        // ── History updates
        const nextExerciseHistory = { ...prev.exerciseHistory };
        (sessionResult.exerciseIds || []).forEach((id) => {
          nextExerciseHistory[id] = (nextExerciseHistory[id] || 0) + 1;
        });
        const nextCompletedDays = sessionResult.dayNumber
          ? [...new Set([...(prev.completedDays || []), sessionResult.dayNumber])].sort((a, b) => a - b)
          : prev.completedDays || [];

        // Store the real calendar date this day was completed (for next-day lock)
        const nextDayCompletionDates = { ...(prev.dayCompletionDates || {}) };
        if (sessionResult.dayNumber && !nextDayCompletionDates[sessionResult.dayNumber]) {
          nextDayCompletionDates[sessionResult.dayNumber] = today;
        }

        // Track workout type history for character morphing
        const wType = sessionResult.workoutType || "cardio";
        const nextWorkoutTypeHistory = { ...(prev.workoutTypeHistory || {}) };
        nextWorkoutTypeHistory[wType] = (nextWorkoutTypeHistory[wType] || 0) + 1;

        const updated = {
          ...prev,
          points: prev.points + totalPoints,
          totalWorkouts: prev.totalWorkouts + 1,
          totalExercises: prev.totalExercises + sessionResult.exerciseCount,
          quizCorrect: prev.quizCorrect + quizResult.correct,
          quizAnswered: prev.quizAnswered + quizResult.total,
          completedDays: nextCompletedDays,
          dayCompletionDates: nextDayCompletionDates,
          exerciseHistory: nextExerciseHistory,
          workoutTypeHistory: nextWorkoutTypeHistory,
          currentStreak: newStreak,
          longestStreak: Math.max(prev.longestStreak || 0, newStreak),
          lastWorkoutDate: today,
          totalCalories: (prev.totalCalories || 0) + (sessionResult.calories || 0),
          today: {
            steps: prev.today.steps + sessionResult.steps,
            calories: prev.today.calories + sessionResult.calories,
            activeMinutes: prev.today.activeMinutes + sessionResult.activeMinutes,
          },
        };

        // ── Achievements check — must use prev.unlockedAchievements (before mutation)
        const newlyUnlocked = checkAchievements({ ...updated, unlockedAchievements: prev.unlockedAchievements || [] }, quizResult);
        const achievementBonus = newlyUnlocked.length * 100;
        if (newlyUnlocked.length > 0) {
          updated.unlockedAchievements = [...(prev.unlockedAchievements || []), ...newlyUnlocked];
          updated.points += achievementBonus;
        }

        setSummary({
          session: sessionResult,
          quiz: quizResult,
          exercisePoints,
          quizPoints,
          consistencyPoints,
          perfectBonus,
          streakBonus,
          streakMultiplier,
          totalPoints: totalPoints + achievementBonus,
          previousPoints: prev.points,
          updatedPoints: updated.points,
          dayNumber: sessionResult.dayNumber,
          difficultyTier: sessionResult.difficultyTier,
          newStreak,
          newlyUnlocked,
          achievementBonus,
        });

        return updated;
      });

      setRoute("summary");
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.appBg} />

        {route === "player_setup" && (
          <PlayerSetupScreen profile={profile} setProfile={setProfile} onContinue={handlePlayerStart} />
        )}
        {route === "dashboard" && (
          <DashboardScreen
            profile={profile}
            stats={stats}
            character={character}
            onStartWorkout={startWorkoutFlow}
            onOpenProgress={() => setRoute("progress")}
            onOpenArmory={() => setArmoryVisible(true)}
            onOpenCharacter={() => setRoute("character")}
          />
        )}
        {route === "day_select" && (
          <DaySelectionScreen profile={profile} stats={stats} workoutPlan={workoutPlan} setWorkoutPlan={setWorkoutPlan} onBack={() => setRoute("dashboard")} onContinue={confirmDaySelection} />
        )}
        {route === "workout_type" && (
          <WorkoutTypeScreen workoutPlan={workoutPlan} setWorkoutPlan={setWorkoutPlan} onBack={() => setRoute("dashboard")} onContinue={goToExerciseSelection} />
        )}
        {route === "exercise_select" && (
          <ExerciseSelectionScreen workoutPlan={workoutPlan} setWorkoutPlan={setWorkoutPlan} onBack={() => setRoute("workout_type")} onContinue={goToTopicSelection} />
        )}
        {route === "topic_select" && (
          <TopicSelectionScreen workoutPlan={workoutPlan} setWorkoutPlan={setWorkoutPlan} onBack={() => setRoute("day_select")} onContinue={startSession} />
        )}
        {route === "session" && (
          <ActiveSessionScreen workoutPlan={workoutPlan} onCancel={() => setRoute("topic_select")} onComplete={handleSessionComplete} />
        )}
        {route === "quiz" && sessionResult && (
          <QuizScreen
            topicKey={sessionResult.topicKey}
            questionCount={sessionResult.plannedQuestionCount || Math.min(6, Math.max(3, sessionResult.exerciseCount))}
            difficultyTier={sessionResult.difficultyTier || 1}
            onCancel={() => setRoute("dashboard")}
            onComplete={handleQuizComplete}
          />
        )}
        {route === "summary" && summary && (
          <SummaryScreen summary={summary} onReturnHome={() => setRoute("dashboard")} onRepeat={startWorkoutFlow} />
        )}
        {route === "progress" && (
          <ProgressScreen stats={stats} onBack={() => setRoute("dashboard")} />
        )}
        {route === "character" && (
          <CharacterScreen
            character={character}
            setCharacter={setCharacter}
            points={stats.points}
            setStats={setStats}
            workoutTypeHistory={stats.workoutTypeHistory || {}}
            onBack={() => setRoute("dashboard")}
          />
        )}

        <ArmoryModal
          visible={armoryVisible}
          onClose={() => setArmoryVisible(false)}
          points={stats.points}
          inventory={inventory}
          setInventory={setInventory}
          setProfile={setProfile}
        />
      </SafeAreaView>
    );
  }

  // ─── ExerciseMedia (cross-platform video fix) ──────────────────────────────────

  function ExerciseMedia({ source, fallbackSource, style, onError }) {
    const [failed, setFailed] = useState(false);
    const [useNative, setUseNative] = useState(Platform.OS !== "web");
    const videoRef = useRef(null);

    // Resolve asset URI from require() result
    function resolveUri(src) {
      if (!src) return null;
      if (typeof src === "string") return src;
      if (src && src.uri) return src.uri;
      // For web, expo asset module exposes .uri or resolves inline
      try {
        const Asset = require("expo-asset").Asset;
        const asset = Asset.fromModule(src);
        return asset.localUri || asset.uri;
      } catch (_) {}
      return null;
    }

    const uri = resolveUri(failed && fallbackSource ? fallbackSource : source);

    if (!uri) {
      return <View style={[style, styles.mediaFallback]}><Text style={styles.mediaFallbackText}>Exercise preview unavailable</Text></View>;
    }

    // Web: use HTML5 video element
    if (Platform.OS === "web") {
      return (
        <View style={style}>
          <video
            src={uri}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12, backgroundColor: "#fff" }}
            onError={() => {
              if (!failed && fallbackSource) { setFailed(true); }
              else if (onError) { onError(); }
            }}
          />
        </View>
      );
    }

    // Native: expo-av Video
    if (NativeVideo) {
      return (
        <NativeVideo
          ref={videoRef}
          source={typeof source === "string" ? { uri } : source}
          style={style}
          resizeMode="contain"
          isLooping
          shouldPlay
          isMuted
          onError={() => {
            if (!failed && fallbackSource) { setFailed(true); }
            else if (onError) { onError(); }
          }}
        />
      );
    }

    return <View style={[style, styles.mediaFallback]}><Text style={styles.mediaFallbackText}>Exercise preview unavailable</Text></View>;
  }

  // ─── CharacterAvatar ─────────────────────────────────────────────────────────
  // SVG on web (crisp, cute chibi with proper wardrobe), Views on native (clean fallback)
  // Body morphs progressively: lifters get broader + muscular, cardio runners get leaner + longer legs

  function CharacterAvatar({ character, size = 160, showName = false, workoutTypeHistory = {} }) {
    const body = CHARACTER_BODIES.find((b) => b.id === character.bodyId) || CHARACTER_BODIES[0];
    const hatI = WARDROBE_ITEMS.find((w) => w.id === character.hat)  || WARDROBE_ITEMS.find(w => w.slot === "hat"  && w.free);
    const topI = WARDROBE_ITEMS.find((w) => w.id === character.top)  || WARDROBE_ITEMS.find(w => w.slot === "top"  && w.free);
    const botI = WARDROBE_ITEMS.find((w) => w.id === character.bot)  || WARDROBE_ITEMS.find(w => w.slot === "bot"  && w.free);
    const accI = WARDROBE_ITEMS.find((w) => w.id === character.acc)  || WARDROBE_ITEMS.find(w => w.slot === "acc"  && w.free);

    const liftP   = Math.min(1, (workoutTypeHistory.weightlifting || 0) / 20);
    const cardioP = Math.min(1, (workoutTypeHistory.cardio || 0) / 20);

    // ── Color resolution ──────────────────────────────────────────────────────
    const skinC  = body.skinTone;
    const hairC  = body.hairColor;
    const shirtC = topI?.id === "top_hoodie" ? "#455a64"
                : topI?.id === "top_jersey" ? "#c2185b"
                : topI?.id === "top_cape"   ? "#5e35b1"
                : body.shirtColor;
    const pantsC = botI?.id === "bot_joggers" ? "#37474f"
                : botI?.id === "bot_armor"   ? "#b71c1c"
                : body.pantsColor;
    const eyeC   = body.eyeColor;
    const glowC  = body.color;

    // ── Local shade helper ────────────────────────────────────────────────────
    function sh(hex, amt) {
      try {
        const h = hex.replace("#", "");
        const r = Math.max(0, Math.min(255, parseInt(h.slice(0,2),16) + amt));
        const g = Math.max(0, Math.min(255, parseInt(h.slice(2,4),16) + amt));
        const b = Math.max(0, Math.min(255, parseInt(h.slice(4,6),16) + amt));
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
      } catch { return hex; }
    }

    // ── Morph dimensions (raw SVG units, viewBox 160) ─────────────────────────
    const sw  = liftP * 14;         // extra shoulder width (0→14)
    const aw  = 13 + liftP * 7;     // arm width (13→20)
    const ll  = 54 + cardioP * 14;  // leg height (54→68)

    // ── Layout constants ──────────────────────────────────────────────────────
    const VW  = 160;
    const hcx = 80, hcy = 62, hr = 42;                     // head
    const nkw = 16 + liftP * 8;
    const nky = hcy + hr - 4;
    const nkh = 13;

    const tTW = 54 + sw * 2;
    const tBW = 46 + sw * 1.3;
    const tH  = 50 + liftP * 12;
    const tTY = nky + nkh;
    const tBY = tTY + tH;

    const armTY = tTY + 2;
    const armBY = tBY - 6;
    const armLX = hcx - tTW / 2 - aw + 3;
    const armRX = hcx + tTW / 2 - 3;
    const handR = 10 + liftP * 2;

    const legW   = 20 + liftP * 4;
    const legGap = 6;
    const legTY  = tBY + 2;
    const legBY  = legTY + ll;

    const shoeW  = 27 + liftP * 3;
    const shoeH  = 12;
    const shoeY  = legBY - 5;
    const totalH = shoeY + shoeH + 16;

    const uid = body.id; // for unique gradient IDs

    // ────────────────────────────────────────────────────────────────────────────
    // WEB — full SVG character
    // ────────────────────────────────────────────────────────────────────────────
    if (Platform.OS === "web") {
      const shoeColor = cardioP > 0.5 ? "#e53935" : liftP > 0.5 ? "#1a237e" : "#212121";
      return (
        <div style={{ display: "inline-block", lineHeight: 0, position: "relative" }}>
          <svg
            viewBox={`0 0 ${VW} ${totalH}`}
            width={size}
            height={Math.round(size * totalH / VW)}
            style={{ overflow: "visible" }}
          >
            <defs>
              <radialGradient id={`sk${uid}`} cx="35%" cy="28%" r="65%">
                <stop offset="0%" stopColor={sh(skinC, 30)} />
                <stop offset="100%" stopColor={sh(skinC, -14)} />
              </radialGradient>
              <linearGradient id={`st${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor={sh(shirtC, 24)} />
                <stop offset="100%" stopColor={sh(shirtC, -30)} />
              </linearGradient>
              <linearGradient id={`pt${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor={sh(pantsC, 20)} />
                <stop offset="100%" stopColor={sh(pantsC, -24)} />
              </linearGradient>
              <radialGradient id={`hr${uid}`} cx="28%" cy="20%" r="72%">
                <stop offset="0%" stopColor={sh(hairC, 40)} />
                <stop offset="100%" stopColor={sh(hairC, -20)} />
              </radialGradient>
            </defs>

            {/* ── Ground shadow ── */}
            <ellipse cx={hcx} cy={totalH - 3} rx={35} ry={5} fill={glowC} opacity="0.22" />

            {/* ── WINGS (behind everything) ── */}
            {accI?.id === "acc_wings" && <>
              <path d={`M ${hcx-14} ${tTY+22} C ${hcx-68} ${tTY-10} ${hcx-60} ${tBY-4} ${hcx-12} ${tTY+34} Z`}
                fill="#e1bee7" stroke="#9c27b0" strokeWidth="1.5" opacity="0.92" />
              <path d={`M ${hcx+14} ${tTY+22} C ${hcx+68} ${tTY-10} ${hcx+60} ${tBY-4} ${hcx+12} ${tTY+34} Z`}
                fill="#e1bee7" stroke="#9c27b0" strokeWidth="1.5" opacity="0.92" />
              <path d={`M ${hcx-14} ${tTY+22} C ${hcx-44} ${tTY+2} ${hcx-42} ${tTY+28} ${hcx-12} ${tTY+34} Z`}
                fill="#ce93d8" opacity="0.5" />
              <path d={`M ${hcx+14} ${tTY+22} C ${hcx+44} ${tTY+2} ${hcx+42} ${tTY+28} ${hcx+12} ${tTY+34} Z`}
                fill="#ce93d8" opacity="0.5" />
            </>}

            {/* ── CAPE (behind body) ── */}
            {topI?.id === "top_cape" && (
              <path
                d={`M ${hcx-8} ${tTY} L ${hcx-tTW/2-18} ${tBY+32} Q ${hcx} ${tBY+12} ${hcx+tTW/2+18} ${tBY+32} L ${hcx+8} ${tTY} Z`}
                fill="#7b1fa2" opacity="0.9"
              />
            )}

            {/* ── LEFT ARM ── */}
            <rect x={armLX} y={armTY} width={aw} height={armBY - armTY} rx={aw/2} fill={`url(#st${uid})`} />
            {/* Arm highlight */}
            <rect x={armLX + 2} y={armTY + 5} width={aw * 0.35} height={(armBY - armTY) * 0.55} rx={3} fill="white" opacity="0.13" />
            {/* Left hand */}
            <circle cx={armLX + aw/2} cy={armBY + handR * 0.7} r={handR} fill={`url(#sk${uid})`} />
            <ellipse cx={armLX + aw/2 - 3} cy={armBY + handR * 0.4} rx={handR * 0.45} ry={handR * 0.32} fill="white" opacity="0.2" />

            {/* ── RIGHT ARM + hand / sword ── */}
            <rect x={armRX} y={armTY} width={aw} height={armBY - armTY} rx={aw/2} fill={`url(#st${uid})`} />
            <rect x={armRX + aw * 0.55} y={armTY + 5} width={aw * 0.35} height={(armBY - armTY) * 0.55} rx={3} fill="white" opacity="0.13" />
            {accI?.id === "acc_sword" ? (
              <>
                {/* Blade */}
                <rect x={armRX + aw/2 - 2.5} y={armBY - 2} width={5} height={44} rx={2.5} fill="#b0bec5" />
                <rect x={armRX + aw/2 - 2.5} y={armBY - 2} width={5} height={44} rx={2.5} fill="none" stroke="#90a4ae" strokeWidth="0.5" />
                {/* Crossguard */}
                <rect x={armRX + aw/2 - 12} y={armBY + 9} width={24} height={6} rx={3} fill="#ffd700" />
                {/* Pommel */}
                <rect x={armRX + aw/2 - 3} y={armBY - 8} width={6} height={12} rx={3} fill="#ffd700" />
                {/* Blade shine */}
                <line x1={armRX + aw/2 + 1} y1={armBY + 2} x2={armRX + aw/2 + 1} y2={armBY + 36} stroke="white" strokeWidth="1.5" opacity="0.4" />
              </>
            ) : (
              <>
                <circle cx={armRX + aw/2} cy={armBY + handR * 0.7} r={handR} fill={`url(#sk${uid})`} />
                <ellipse cx={armRX + aw/2 + 3} cy={armBY + handR * 0.4} rx={handR * 0.45} ry={handR * 0.32} fill="white" opacity="0.2" />
              </>
            )}

            {/* ── TORSO ── */}
            <path
              d={`M ${hcx-tTW/2} ${tTY} Q ${hcx-tTW/2-4} ${tTY+6} ${hcx-tBW/2} ${tBY} L ${hcx+tBW/2} ${tBY} Q ${hcx+tTW/2+4} ${tTY+6} ${hcx+tTW/2} ${tTY} Z`}
              fill={`url(#st${uid})`}
            />
            {/* Torso highlight */}
            <ellipse cx={hcx - tTW*0.2} cy={tTY + 14} rx={7} ry={12} fill="white" opacity="0.16" />
            {/* Jersey number */}
            {topI?.id === "top_jersey" && (
              <text x={hcx} y={tTY + 36} textAnchor="middle" fill="white" opacity="0.72" fontWeight="900" fontSize="22">23</text>
            )}
            {/* Hoodie front pocket */}
            {topI?.id === "top_hoodie" && (
              <path d={`M ${hcx-16} ${tBY-16} Q ${hcx} ${tBY-22} ${hcx+16} ${tBY-16} L ${hcx+14} ${tBY-2} Q ${hcx} ${tBY+2} ${hcx-14} ${tBY-2} Z`}
                fill={sh(shirtC, -20)} opacity="0.6" />
            )}
            {/* Muscle definition (lifters) */}
            {liftP > 0.4 && <>
              <line x1={hcx} y1={tTY + 10} x2={hcx} y2={tBY - 8} stroke={sh(shirtC,-38)} strokeWidth="1.5" opacity="0.28" />
              <path d={`M ${hcx-14} ${tTY+26} Q ${hcx} ${tTY+32} ${hcx+14} ${tTY+26}`} stroke={sh(shirtC,-32)} strokeWidth="1.3" fill="none" opacity="0.32" />
              {liftP > 0.7 && <path d={`M ${hcx-12} ${tTY+38} Q ${hcx} ${tTY+43} ${hcx+12} ${tTY+38}`} stroke={sh(shirtC,-32)} strokeWidth="1.2" fill="none" opacity="0.28" />}
            </>}
            {/* Torso shading (right side) */}
            <path d={`M ${hcx+tTW*0.28} ${tTY+4} Q ${hcx+tTW/2+3} ${tTY+8} ${hcx+tBW/2} ${tBY}`}
              stroke={sh(shirtC,-40)} strokeWidth="5" fill="none" opacity="0.22" strokeLinecap="round" />

            {/* ── NECK ── */}
            <rect x={hcx - nkw/2} y={nky} width={nkw} height={nkh + 4} rx={nkw/2} fill={`url(#sk${uid})`} />

            {/* ── BELT ── */}
            <rect x={hcx-tBW/2+2} y={tBY-4} width={tBW-4} height={9} rx={3} fill={sh(pantsC,-18)} />
            <rect x={hcx-7} y={tBY-3} width={14} height={7} rx={2} fill="#ffd700" />
            <rect x={hcx-4} y={tBY-2} width={8} height={5} rx={1.5} fill={pantsC} />

            {/* ── LEFT LEG ── */}
            <rect x={hcx-legGap/2-legW} y={legTY} width={legW} height={ll} rx={legW/2} fill={`url(#pt${uid})`} />
            <rect x={hcx-legGap/2-legW+3} y={legTY+5} width={legW*0.35} height={ll*0.55} rx={3} fill="white" opacity="0.11" />
            {botI?.id === "bot_joggers" && (
              <rect x={hcx-legGap/2-legW-3} y={legBY-13} width={legW+6} height={11} rx={5} fill={sh(pantsC,28)} />
            )}
            {botI?.id === "bot_armor" && <>
              <rect x={hcx-legGap/2-legW+3} y={legTY+6} width={legW-6} height={ll*0.36} rx={4} fill={sh(pantsC,32)} opacity="0.55" />
              <line x1={hcx-legGap/2-legW+4} y1={legTY+ll*0.44} x2={hcx-legGap/2-4} y2={legTY+ll*0.44} stroke={sh(pantsC,-40)} strokeWidth="1.5" />
            </>}
            {cardioP > 0.4 && (
              <line x1={hcx-legGap/2-legW+legW*0.38} y1={legTY+9} x2={hcx-legGap/2-legW+legW*0.38} y2={legBY-9}
                stroke="white" strokeWidth="2" opacity="0.28" strokeDasharray="4,4" />
            )}

            {/* ── RIGHT LEG ── */}
            <rect x={hcx+legGap/2} y={legTY} width={legW} height={ll} rx={legW/2} fill={`url(#pt${uid})`} />
            <rect x={hcx+legGap/2+3} y={legTY+5} width={legW*0.35} height={ll*0.55} rx={3} fill="white" opacity="0.11" />
            {botI?.id === "bot_joggers" && (
              <rect x={hcx+legGap/2-3} y={legBY-13} width={legW+6} height={11} rx={5} fill={sh(pantsC,28)} />
            )}
            {botI?.id === "bot_armor" && <>
              <rect x={hcx+legGap/2+3} y={legTY+6} width={legW-6} height={ll*0.36} rx={4} fill={sh(pantsC,32)} opacity="0.55" />
              <line x1={hcx+legGap/2+3} y1={legTY+ll*0.44} x2={hcx+legGap/2+legW-4} y2={legTY+ll*0.44} stroke={sh(pantsC,-40)} strokeWidth="1.5" />
            </>}
            {cardioP > 0.4 && (
              <line x1={hcx+legGap/2+legW*0.38} y1={legTY+9} x2={hcx+legGap/2+legW*0.38} y2={legBY-9}
                stroke="white" strokeWidth="2" opacity="0.28" strokeDasharray="4,4" />
            )}

            {/* ── SHOES ── */}
            {/* Left */}
            <rect x={hcx-legGap/2-legW-5} y={shoeY} width={shoeW} height={shoeH} rx={6} fill={shoeColor} />
            <rect x={hcx-legGap/2-legW-1} y={shoeY+2} width={shoeW-9} height={shoeH-6} rx={3} fill="rgba(255,255,255,0.18)" />
            {cardioP > 0.3 && <rect x={hcx-legGap/2-legW+2} y={shoeY+shoeH-4} width={16} height={2.5} rx={1} fill="white" opacity="0.35" />}
            {/* Right */}
            <rect x={hcx+legGap/2-2} y={shoeY} width={shoeW} height={shoeH} rx={6} fill={shoeColor} />
            <rect x={hcx+legGap/2+2} y={shoeY+2} width={shoeW-9} height={shoeH-6} rx={3} fill="rgba(255,255,255,0.18)" />
            {cardioP > 0.3 && <rect x={hcx+legGap/2+4} y={shoeY+shoeH-4} width={16} height={2.5} rx={1} fill="white" opacity="0.35" />}

            {/* ══════════ HEAD (on top of everything) ══════════ */}
            {/* Hair back mass */}
            <ellipse cx={hcx} cy={hcy+10} rx={hr+5} ry={hr*0.9} fill={`url(#hr${uid})`} />

            {/* Ears */}
            <ellipse cx={hcx-hr-1} cy={hcy+7} rx={10} ry={13} fill={`url(#sk${uid})`} />
            <ellipse cx={hcx-hr-1} cy={hcy+7} rx={5.5} ry={8} fill={sh(skinC,-26)} opacity="0.4" />
            <ellipse cx={hcx+hr+1} cy={hcy+7} rx={10} ry={13} fill={`url(#sk${uid})`} />
            <ellipse cx={hcx+hr+1} cy={hcy+7} rx={5.5} ry={8} fill={sh(skinC,-26)} opacity="0.4" />

            {/* Face */}
            <circle cx={hcx} cy={hcy} r={hr} fill={`url(#sk${uid})`} />
            {/* Face top highlight */}
            <ellipse cx={hcx-13} cy={hcy-16} rx={16} ry={11} fill="white" opacity="0.19" transform={`rotate(-22,${hcx-13},${hcy-16})`} />
            {/* Cheeks */}
            <ellipse cx={hcx-27} cy={hcy+14} rx={13} ry={8} fill="#f48fb1" opacity="0.46" />
            <ellipse cx={hcx+27} cy={hcy+14} rx={13} ry={8} fill="#f48fb1" opacity="0.46" />
            {/* Bottom face shadow */}
            <ellipse cx={hcx} cy={hcy+hr*0.68} rx={hr*0.72} ry={hr*0.32} fill={sh(skinC,-18)} opacity="0.24" />

            {/* ── Eyebrows ── */}
            <path d={`M ${hcx-29} ${hcy-13} Q ${hcx-19} ${hcy-20} ${hcx-7} ${hcy-14}`} stroke={hairC} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={`M ${hcx+29} ${hcy-13} Q ${hcx+19} ${hcy-20} ${hcx+7} ${hcy-14}`} stroke={hairC} strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* ── LEFT EYE ── */}
            <ellipse cx={hcx-17} cy={hcy-1} rx={12} ry={13} fill="white" />
            {/* Top eyelash */}
            <path d={`M ${hcx-29} ${hcy-6} Q ${hcx-17} ${hcy-18} ${hcx-5} ${hcy-6}`} stroke={sh(hairC,-8)} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx={hcx-17} cy={hcy} r={9} fill={eyeC} />
            <circle cx={hcx-17} cy={hcy} r={5.5} fill="#0a0a0a" />
            {/* Eye shine */}
            <circle cx={hcx-21} cy={hcy-4} r={3} fill="white" opacity="0.96" />
            <circle cx={hcx-13} cy={hcy+2} r={1.8} fill="white" opacity="0.55" />
            {/* Bottom eyelash */}
            <path d={`M ${hcx-27} ${hcy+7} Q ${hcx-17} ${hcy+11} ${hcx-7} ${hcy+7}`} stroke={sh(hairC,-8)} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.5" />

            {/* ── RIGHT EYE ── */}
            <ellipse cx={hcx+17} cy={hcy-1} rx={12} ry={13} fill="white" />
            <path d={`M ${hcx+29} ${hcy-6} Q ${hcx+17} ${hcy-18} ${hcx+5} ${hcy-6}`} stroke={sh(hairC,-8)} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx={hcx+17} cy={hcy} r={9} fill={eyeC} />
            <circle cx={hcx+17} cy={hcy} r={5.5} fill="#0a0a0a" />
            <circle cx={hcx+13} cy={hcy-4} r={3} fill="white" opacity="0.96" />
            <circle cx={hcx+21} cy={hcy+2} r={1.8} fill="white" opacity="0.55" />
            <path d={`M ${hcx+27} ${hcy+7} Q ${hcx+17} ${hcy+11} ${hcx+7} ${hcy+7}`} stroke={sh(hairC,-8)} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.5" />

            {/* ── GLASSES (over eyes) ── */}
            {accI?.id === "acc_glasses" && <>
              <rect x={hcx-32} y={hcy-16} width={28} height={26} rx={7} fill="rgba(180,220,255,0.12)" stroke="#1a1a2e" strokeWidth="2.8" />
              <rect x={hcx+4} y={hcy-16} width={28} height={26} rx={7} fill="rgba(180,220,255,0.12)" stroke="#1a1a2e" strokeWidth="2.8" />
              <line x1={hcx-4} y1={hcy-3} x2={hcx+4} y2={hcy-3} stroke="#1a1a2e" strokeWidth="2.2" />
              <line x1={hcx-32} y1={hcy-3} x2={hcx-40} y2={hcy} stroke="#1a1a2e" strokeWidth="1.8" />
              <line x1={hcx+32} y1={hcy-3} x2={hcx+40} y2={hcy} stroke="#1a1a2e" strokeWidth="1.8" />
              <rect x={hcx-30} y={hcy-14} width={10} height={7} rx={3} fill="white" opacity="0.3" />
              <rect x={hcx+6} y={hcy-14} width={10} height={7} rx={3} fill="white" opacity="0.3" />
            </>}

            {/* ── Nose ── */}
            <ellipse cx={hcx-5} cy={hcy+14} rx={4} ry={3} fill={sh(skinC,-26)} opacity="0.46" />
            <ellipse cx={hcx+5} cy={hcy+14} rx={4} ry={3} fill={sh(skinC,-26)} opacity="0.46" />

            {/* ── Mouth ── cute arc smile */}
            <path d={`M ${hcx-13} ${hcy+23} Q ${hcx} ${hcy+36} ${hcx+13} ${hcy+23}`} stroke={sh(skinC,-54)} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            {/* Teeth hint for big smilers */}
            {liftP > 0.5 && <path d={`M ${hcx-9} ${hcy+24} Q ${hcx} ${hcy+32} ${hcx+9} ${hcy+24}`} fill="white" opacity="0.4" />}

            {/* ── HAIR front mass ── */}
            <path
              d={`M ${hcx-hr-3} ${hcy-5} Q ${hcx-hr} ${hcy-hr-14} ${hcx} ${hcy-hr-12} Q ${hcx+hr} ${hcy-hr-14} ${hcx+hr+3} ${hcy-5} Q ${hcx+hr-2} ${hcy-2} ${hcx} ${hcy-hr+8} Q ${hcx-hr+2} ${hcy-2} ${hcx-hr-3} ${hcy-5} Z`}
              fill={`url(#hr${uid})`}
            />
            {/* Front fringe tuft */}
            <path d={`M ${hcx+10} ${hcy-hr+5} Q ${hcx+22} ${hcy-hr-10} ${hcx+30} ${hcy-hr+12} Q ${hcx+20} ${hcy-9} ${hcx+8} ${hcy-14} Z`} fill={hairC} />
            {/* Second tuft */}
            <path d={`M ${hcx-5} ${hcy-hr+3} Q ${hcx+5} ${hcy-hr-8} ${hcx+12} ${hcy-hr+6} Q ${hcx+6} ${hcy-10} ${hcx-4} ${hcy-14} Z`} fill={sh(hairC,10)} opacity="0.8" />
            {/* Side lock left */}
            <path d={`M ${hcx-hr-2} ${hcy-5} Q ${hcx-hr-14} ${hcy+12} ${hcx-hr-8} ${hcy+32}`} stroke={hairC} strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Hair shine streak */}
            <path d={`M ${hcx-10} ${hcy-hr+5} Q ${hcx-3} ${hcy-hr-5} ${hcx+4} ${hcy-hr+8}`} stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.36" />

            {/* ════════════════ HATS ════════════════ */}
            {hatI?.id === "hat_cap" && <>
              {/* Cap dome */}
              <path d={`M ${hcx-hr-2} ${hcy-4} Q ${hcx-hr} ${hcy-hr-4} ${hcx} ${hcy-hr-8} Q ${hcx+hr} ${hcy-hr-4} ${hcx+hr+2} ${hcy-4}`}
                stroke="#3949ab" strokeWidth="14" fill="none" strokeLinecap="round" />
              {/* Brim */}
              <path d={`M ${hcx-hr-10} ${hcy-7} Q ${hcx} ${hcy-3} ${hcx+hr+10} ${hcy-7}`}
                stroke="#283593" strokeWidth="9" fill="none" strokeLinecap="round" />
              {/* Brim highlight */}
              <path d={`M ${hcx-hr-6} ${hcy-9} Q ${hcx} ${hcy-5} ${hcx+hr+6} ${hcy-9}`}
                stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.25" />
              {/* Logo */}
              <circle cx={hcx} cy={hcy-hr} r={5} fill="white" />
              <circle cx={hcx} cy={hcy-hr} r={3} fill="#3949ab" />
            </>}
            {hatI?.id === "hat_crown" && <>
              <rect x={hcx-26} y={hcy-hr-7} width={52} height={16} rx={3} fill="#ffd700" />
              <rect x={hcx-26} y={hcy-hr-7} width={52} height={5} rx={2} fill="white" opacity="0.3" />
              <polygon points={`${hcx-24},${hcy-hr-7} ${hcx-18},${hcy-hr-27} ${hcx-12},${hcy-hr-7}`} fill="#ffd700" />
              <polygon points={`${hcx-5},${hcy-hr-7} ${hcx},${hcy-hr-31} ${hcx+5},${hcy-hr-7}`} fill="#ffd700" />
              <polygon points={`${hcx+12},${hcy-hr-7} ${hcx+18},${hcy-hr-27} ${hcx+24},${hcy-hr-7}`} fill="#ffd700" />
              <circle cx={hcx-18} cy={hcy-hr-2} r={5} fill="#e91e63" />
              <circle cx={hcx} cy={hcy-hr-2} r={5} fill="#2196f3" />
              <circle cx={hcx+18} cy={hcy-hr-2} r={5} fill="#4caf50" />
              <circle cx={hcx-18} cy={hcy-hr-2} r={2.5} fill="white" opacity="0.55" />
              <circle cx={hcx} cy={hcy-hr-2} r={2.5} fill="white" opacity="0.55" />
              <circle cx={hcx+18} cy={hcy-hr-2} r={2.5} fill="white" opacity="0.55" />
              <path d={`M ${hcx-8} ${hcy-hr-22} L ${hcx-5} ${hcy-hr-30}`} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </>}
            {hatI?.id === "hat_helmet" && <>
              <path d={`M ${hcx-hr-4} ${hcy+10} Q ${hcx-hr-10} ${hcy-hr-16} ${hcx} ${hcy-hr-18} Q ${hcx+hr+10} ${hcy-hr-16} ${hcx+hr+4} ${hcy+10} Z`}
                fill="#546e7a" />
              <path d={`M ${hcx-hr-2} ${hcy+6} Q ${hcx-hr+4} ${hcy+18} ${hcx+hr-4} ${hcy+18} Q ${hcx+hr+2} ${hcy+6} ${hcx+hr+2} ${hcy+6} Z`}
                fill="#263238" opacity="0.9" />
              {/* Helmet shine */}
              <path d={`M ${hcx-22} ${hcy-hr-10} Q ${hcx-8} ${hcy-hr-18} ${hcx+8} ${hcy-hr-8}`}
                stroke="white" strokeWidth="3.5" fill="none" opacity="0.36" strokeLinecap="round" />
              <path d={`M ${hcx-18} ${hcy-hr+2} Q ${hcx-10} ${hcy-hr-4} ${hcx+2} ${hcy-hr+4}`}
                stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" strokeLinecap="round" />
            </>}
            {hatI?.id === "hat_halo" && <>
              <ellipse cx={hcx} cy={hcy-hr-12} rx={29} ry={9} fill="none" stroke="#ffd700" strokeWidth="7" />
              <ellipse cx={hcx} cy={hcy-hr-12} rx={29} ry={9} fill="none" stroke="white" strokeWidth="2.5" opacity="0.5" />
              {/* Halo glow */}
              <ellipse cx={hcx} cy={hcy-hr-12} rx={29} ry={9} fill="none" stroke="#ffd700" strokeWidth="12" opacity="0.12" />
            </>}

            {/* ── ACCESSORIES ── */}
            {accI?.id === "acc_medal" && <>
              <rect x={hcx-5} y={tTY+4} width={10} height={22} rx={3} fill="#e91e63" />
              <rect x={hcx-5} y={tTY+14} width={10} height={6} rx={2} fill="#c2185b" />
              <circle cx={hcx} cy={tTY+30} r={12} fill="#ffd700" />
              <circle cx={hcx} cy={tTY+30} r={9} fill="#ffca28" />
              <text x={hcx} y={tTY+35} textAnchor="middle" fill="#4e342e" fontSize="10" fontWeight="900">1</text>
              <ellipse cx={hcx-4} cy={tTY+26} rx={4} ry={3} fill="white" opacity="0.4" />
            </>}

            {/* ── BODY LABEL ── */}
            {showName && <>
              <rect x={hcx-34} y={totalH-13} width={68} height={15} rx={5} fill={glowC} opacity="0.2" />
              <rect x={hcx-34} y={totalH-13} width={68} height={15} rx={5} fill="none" stroke={glowC} strokeWidth="1" />
              <text x={hcx} y={totalH-1} textAnchor="middle" fill={glowC} fontSize="8.5" fontWeight="900" letterSpacing="0.8">
                {liftP > 0.6 ? "POWERHOUSE" : cardioP > 0.6 ? "SPEEDSTER" : body.label.toUpperCase()}
              </text>
            </>}
          </svg>
        </div>
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // NATIVE — improved View-based fallback
    // ────────────────────────────────────────────────────────────────────────────
    const sc2 = size / 160;
    const N = (n) => Math.round(n * sc2);
    const natH = N(totalH);
    const shoeColorN = cardioP > 0.5 ? "#e53935" : liftP > 0.5 ? "#1a237e" : "#212121";

    return (
      <View style={{ width: N(VW), height: natH }}>
        {/* Arms */}
        <View style={{ position: "absolute", top: N(armTY), left: N(armLX), width: N(aw), height: N(armBY-armTY), borderRadius: N(aw/2), backgroundColor: shirtC }} />
        <View style={{ position: "absolute", top: N(armBY+handR*0.2), left: N(armLX+aw/2-handR), width: N(handR*2), height: N(handR*2), borderRadius: N(handR), backgroundColor: skinC }} />
        <View style={{ position: "absolute", top: N(armTY), left: N(armRX), width: N(aw), height: N(armBY-armTY), borderRadius: N(aw/2), backgroundColor: shirtC }} />
        <View style={{ position: "absolute", top: N(armBY+handR*0.2), left: N(armRX+aw/2-handR), width: N(handR*2), height: N(handR*2), borderRadius: N(handR), backgroundColor: skinC }} />
        {/* Torso */}
        <View style={{ position: "absolute", top: N(tTY), left: N(hcx-tBW/2-2), width: N(tBW+4), height: N(tH), borderRadius: N(10), backgroundColor: shirtC }} />
        {/* Belt */}
        <View style={{ position: "absolute", top: N(tBY-4), left: N(hcx-tBW/2+2), width: N(tBW-4), height: N(9), borderRadius: N(3), backgroundColor: sh(pantsC,-18) }}>
          <View style={{ position: "absolute", top: N(1), left: N((tBW-4)/2-7), width: N(14), height: N(7), borderRadius: N(2), backgroundColor: "#ffd700" }} />
        </View>
        {/* Neck */}
        <View style={{ position: "absolute", top: N(nky), left: N(hcx-nkw/2), width: N(nkw), height: N(nkh+4), borderRadius: N(nkw/2), backgroundColor: skinC }} />
        {/* Legs */}
        <View style={{ position: "absolute", top: N(legTY), left: N(hcx-legGap/2-legW), width: N(legW), height: N(ll), borderRadius: N(legW/2), backgroundColor: pantsC }} />
        <View style={{ position: "absolute", top: N(legTY), left: N(hcx+legGap/2), width: N(legW), height: N(ll), borderRadius: N(legW/2), backgroundColor: pantsC }} />
        {/* Jogger cuffs */}
        {botI?.id === "bot_joggers" && <>
          <View style={{ position: "absolute", top: N(legBY-13), left: N(hcx-legGap/2-legW-3), width: N(legW+6), height: N(11), borderRadius: N(5), backgroundColor: sh(pantsC,28) }} />
          <View style={{ position: "absolute", top: N(legBY-13), left: N(hcx+legGap/2-3), width: N(legW+6), height: N(11), borderRadius: N(5), backgroundColor: sh(pantsC,28) }} />
        </>}
        {/* Shoes */}
        <View style={{ position: "absolute", top: N(shoeY), left: N(hcx-legGap/2-legW-5), width: N(shoeW), height: N(shoeH), borderRadius: N(6), backgroundColor: shoeColorN }} />
        <View style={{ position: "absolute", top: N(shoeY), left: N(hcx+legGap/2-2), width: N(shoeW), height: N(shoeH), borderRadius: N(6), backgroundColor: shoeColorN }} />
        {/* Head — hair back */}
        <View style={{ position: "absolute", top: N(hcy-hr+6), left: N(hcx-hr-5), width: N((hr+5)*2), height: N(hr*1.65), borderRadius: N(hr+5), backgroundColor: hairC, zIndex: 2 }} />
        {/* Ears */}
        <View style={{ position: "absolute", top: N(hcy-5), left: N(hcx-hr-10), width: N(15), height: N(22), borderRadius: N(10), backgroundColor: skinC, zIndex: 3 }} />
        <View style={{ position: "absolute", top: N(hcy-5), left: N(hcx+hr-4), width: N(15), height: N(22), borderRadius: N(10), backgroundColor: skinC, zIndex: 3 }} />
        {/* Face */}
        <View style={{ position: "absolute", top: N(hcy-hr), left: N(hcx-hr), width: N(hr*2), height: N(hr*2), borderRadius: N(hr), backgroundColor: skinC, zIndex: 4 }}>
          {/* Cheeks */}
          <View style={{ position: "absolute", top: N(20), left: N(3), width: N(20), height: N(11), borderRadius: N(10), backgroundColor: "#f48fb1", opacity: 0.44 }} />
          <View style={{ position: "absolute", top: N(20), right: N(3), width: N(20), height: N(11), borderRadius: N(10), backgroundColor: "#f48fb1", opacity: 0.44 }} />
          {/* Left eye */}
          <View style={{ position: "absolute", top: N(14), left: N(7), width: N(22), height: N(24), borderRadius: N(12), backgroundColor: "#fff" }}>
            <View style={{ position: "absolute", top: N(4), left: N(4), width: N(14), height: N(14), borderRadius: N(7), backgroundColor: eyeC }}>
              <View style={{ position: "absolute", top: N(3.5), left: N(3.5), width: N(7), height: N(7), borderRadius: N(3.5), backgroundColor: "#0a0a0a" }} />
              <View style={{ position: "absolute", top: N(1), left: N(1), width: N(5), height: N(5), borderRadius: N(2.5), backgroundColor: "#fff", opacity: 0.96 }} />
            </View>
          </View>
          {/* Right eye */}
          <View style={{ position: "absolute", top: N(14), right: N(7), width: N(22), height: N(24), borderRadius: N(12), backgroundColor: "#fff" }}>
            <View style={{ position: "absolute", top: N(4), left: N(4), width: N(14), height: N(14), borderRadius: N(7), backgroundColor: eyeC }}>
              <View style={{ position: "absolute", top: N(3.5), left: N(3.5), width: N(7), height: N(7), borderRadius: N(3.5), backgroundColor: "#0a0a0a" }} />
              <View style={{ position: "absolute", top: N(1), left: N(1), width: N(5), height: N(5), borderRadius: N(2.5), backgroundColor: "#fff", opacity: 0.96 }} />
            </View>
          </View>
          {/* Nose */}
          <View style={{ position: "absolute", top: N(31), left: N(hr-6), width: N(5), height: N(4), borderRadius: N(2.5), backgroundColor: sh(skinC,-26), opacity: 0.46 }} />
          <View style={{ position: "absolute", top: N(31), left: N(hr+2), width: N(5), height: N(4), borderRadius: N(2.5), backgroundColor: sh(skinC,-26), opacity: 0.46 }} />
          {/* Smile */}
          <View style={{ position: "absolute", top: N(40), left: N(hr-14), width: N(28), height: N(10), borderRadius: N(10), borderBottomWidth: N(3), borderLeftWidth: N(2), borderRightWidth: N(2), borderColor: sh(skinC,-54), opacity: 0.6 }} />
        </View>
        {/* Hair front */}
        <View style={{ position: "absolute", top: N(hcy-hr-4), left: N(hcx-hr-3), width: N((hr+3)*2), height: N(hr+4), borderTopLeftRadius: N(hr+4), borderTopRightRadius: N(hr+4), backgroundColor: hairC, zIndex: 5, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: N(9), left: "28%", width: "16%", height: "52%", borderRadius: N(6), backgroundColor: sh(hairC,40), opacity: 0.32 }} />
        </View>
        {/* Hat emoji on native (simple fallback) */}
        {hatI?.emoji && hatI.emoji !== "—" && (
          <View style={{ position: "absolute", top: N(hcy-hr-20), left: N(hcx-22), zIndex: 8 }}>
            <Text style={{ fontSize: N(40) }}>{hatI.emoji}</Text>
          </View>
        )}
        {/* Accessory emojis on native */}
        {accI?.id === "acc_medal" && <View style={{ position: "absolute", top: N(tTY+16), left: N(hcx-12), zIndex: 8 }}><Text style={{ fontSize: N(24) }}>🏅</Text></View>}
        {accI?.id === "acc_wings" && <View style={{ position: "absolute", top: N(tTY+2), left: N(hcx-50), zIndex: 0 }}><Text style={{ fontSize: N(52) }}>🪽</Text></View>}
        {accI?.id === "acc_sword" && <View style={{ position: "absolute", top: N(armBY-8), left: N(armRX+aw-2), zIndex: 6 }}><Text style={{ fontSize: N(30) }}>⚔️</Text></View>}
        {accI?.id === "acc_glasses" && <View style={{ position: "absolute", top: N(hcy-8), left: N(hcx-28), zIndex: 6 }}><Text style={{ fontSize: N(18) }}>🕶️</Text></View>}
        {showName && (
          <View style={{ position: "absolute", bottom: -N(4), alignSelf: "center", backgroundColor: `${glowC}28`, borderWidth: 1, borderColor: glowC, borderRadius: N(7), paddingHorizontal: N(8), paddingVertical: N(2), zIndex: 10 }}>
            <Text style={{ color: glowC, fontSize: N(9), fontWeight: "900" }}>
              {liftP > 0.6 ? "POWERHOUSE" : cardioP > 0.6 ? "SPEEDSTER" : body.label.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    );
  }


  // Helper: darken or lighten a hex color by amount (-255 to 255)
  function shadeColor(hex, amount) {
    try {
      const h = hex.replace("#", "");
      const parse = (s) => parseInt(s, 16);
      const clamp = (n) => Math.min(255, Math.max(0, n));
      const r = clamp(parse(h.slice(0, 2)) + amount);
      const g = clamp(parse(h.slice(2, 4)) + amount);
      const b = clamp(parse(h.slice(4, 6)) + amount);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    } catch { return hex; }
  }

  // ─── CharacterScreen ───────────────────────────────────────────────────────────

  function CharacterScreen({ character, setCharacter, points, setStats, onBack, workoutTypeHistory = {} }) {
    const [tab, setTab] = useState("body");
    const [wardrobeSlot, setWardrobeSlot] = useState("hat");
    const bounceAnim = useRef(new Animated.Value(1)).current;

    function pulseChar() {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    function buyAndEquipBody(body) {
      const owned = body.free || (character.ownedItems || []).includes(body.id);
      if (owned) { setCharacter((c) => ({ ...c, bodyId: body.id })); pulseChar(); return; }
      if (points < body.price) { Alert.alert("Not enough XP", `You need ${body.price} XP.`); return; }
      Alert.alert("Buy Character?", `Spend ${body.price} XP for ${body.label}?`, [
        { text: "Cancel" },
        { text: "Buy & Equip", onPress: () => {
          setStats((s) => ({ ...s, points: s.points - body.price }));
          setCharacter((c) => ({ ...c, bodyId: body.id, ownedItems: [...(c.ownedItems || []), body.id] }));
          pulseChar();
        }},
      ]);
    }

    function buyAndEquipWardrobe(item) {
      const owned = item.free || (character.ownedItems || []).includes(item.id);
      if (owned) { setCharacter((c) => ({ ...c, [item.slot]: item.id })); pulseChar(); return; }
      if (points < item.price) { Alert.alert("Not enough XP", `You need ${item.price} XP.`); return; }
      Alert.alert("Buy Item?", `Spend ${item.price} XP for ${item.label}?`, [
        { text: "Cancel" },
        { text: "Buy & Equip", onPress: () => {
          setStats((s) => ({ ...s, points: s.points - item.price }));
          setCharacter((c) => ({ ...c, [item.slot]: item.id, ownedItems: [...(c.ownedItems || []), item.id] }));
          pulseChar();
        }},
      ]);
    }

    function buyStatBoost(boost) {
      const owned = (character.ownedItems || []).includes(boost.id);
      if (owned && boost.type !== "consumable") { Alert.alert("Already owned", "This stat boost is already active."); return; }
      if (points < boost.price) { Alert.alert("Not enough XP", `You need ${boost.price} XP.`); return; }
      Alert.alert("Buy Boost?", `Spend ${boost.price} XP for ${boost.label}?`, [
        { text: "Cancel" },
        { text: "Buy", onPress: () => {
          setStats((s) => ({ ...s, points: s.points - boost.price }));
          setCharacter((c) => ({
            ...c,
            ownedItems: boost.type === "consumable" ? c.ownedItems : [...(c.ownedItems || []), boost.id],
            stats: { ...(c.stats || {}), [boost.stat]: ((c.stats || {})[boost.stat] || 0) + boost.value },
          }));
        }},
      ]);
    }

    const body = CHARACTER_BODIES.find((b) => b.id === character.bodyId) || CHARACTER_BODIES[0];
    const SLOTS = ["hat", "top", "bot", "acc"];
    const slotMeta = { hat: { label: "Hat", emoji: "🎩" }, top: { label: "Top", emoji: "👕" }, bot: { label: "Bottom", emoji: "👖" }, acc: { label: "Accessory", emoji: "💎" } };
    const filteredWardrobe = WARDROBE_ITEMS.filter((w) => w.slot === wardrobeSlot);

    const activeBoosts = Object.entries(character.stats || {}).filter(([, v]) => v > 0);

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.appBg }}>
        {/* ── Header ── */}
        <View style={styles.charHeader}>
          <Pressable onPress={onBack} style={styles.charBackBtn}>
            <Text style={styles.charBackBtnText}>←</Text>
          </Pressable>
          <Text style={styles.charHeaderTitle}>MY CHARACTER</Text>
          <View style={styles.charXPBadge}>
            <Text style={styles.charXPText}>{`⭐ ${points}`}</Text>
          </View>
        </View>

        {/* ── Character Stage ── */}
        <View style={styles.charStage}>
          {/* Stage backdrop glow */}
          <View style={[styles.charStageGlow, { backgroundColor: `${body.color}18`, shadowColor: body.color }]} />

          {/* Animated character */}
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <CharacterAvatar character={character} size={180} showName workoutTypeHistory={workoutTypeHistory} />
          </Animated.View>

          {/* Active boost pills */}
          {activeBoosts.length > 0 && (
            <View style={styles.charBoostRow}>
              {activeBoosts.map(([k, v]) => (
                <View key={k} style={styles.charBoostPill}>
                  <Text style={styles.charBoostPillText}>
                    {k === "xpBoost" ? `⭐+${Math.round(v * 100)}%` : k === "calBoost" ? `🔥+${Math.round(v * 100)}%` : k === "streakShield" ? `🛡️×${v}` : `🧠×${v}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {/* Physique progress indicator */}
          {(() => {
            const cardio = (workoutTypeHistory.cardio || 0);
            const lift   = (workoutTypeHistory.weightlifting || 0);
            const total  = cardio + lift;
            if (total === 0) return (
              <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "#1a1129", borderRadius: 99, borderWidth: 1, borderColor: "#2e1d4a" }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700" }}>Complete workouts to morph your character!</Text>
              </View>
            );
            const liftPct  = Math.round((lift  / total) * 100);
            const cardioPct = Math.round((cardio / total) * 100);
            return (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: "700", marginBottom: 4, letterSpacing: 1 }}>PHYSIQUE SHAPE</Text>
                <View style={{ flexDirection: "row", width: 140, height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "#1a1129" }}>
                  <View style={{ width: `${liftPct}%`, backgroundColor: "#f97316" }} />
                  <View style={{ width: `${cardioPct}%`, backgroundColor: "#06d6a0" }} />
                </View>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Text style={{ color: "#f97316", fontSize: 10, fontWeight: "800" }}>💪 {lift} lifts</Text>
                  <Text style={{ color: "#06d6a0", fontSize: 10, fontWeight: "800" }}>🏃 {cardio} cardio</Text>
                </View>
              </View>
            );
          })()}
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.charTabBar}>
          {[["body", "🧬", "Body"], ["wardrobe", "👗", "Wardrobe"], ["boosts", "📈", "Boosts"]].map(([id, icon, label]) => (
            <Pressable key={id} onPress={() => setTab(id)} style={[styles.charTabItem, tab === id ? styles.charTabItemActive : null]}>
              <Text style={styles.charTabIcon}>{icon}</Text>
              <Text style={[styles.charTabLabel, tab === id ? styles.charTabLabelActive : null]}>{label}</Text>
              {tab === id && <View style={styles.charTabIndicator} />}
            </Pressable>
          ))}
        </View>

        {/* ── Tab Content ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }} showsVerticalScrollIndicator={false}>

          {/* ── BODY TAB ── */}
          {tab === "body" && CHARACTER_BODIES.map((b) => {
            const owned = b.free || (character.ownedItems || []).includes(b.id);
            const equipped = character.bodyId === b.id;
            return (
              <Pressable key={b.id} onPress={() => buyAndEquipBody(b)}
                style={[styles.charItemCard, equipped ? { borderColor: b.color, backgroundColor: `${b.color}15` } : null]}>
                <View style={[styles.charItemCardSwatch, { backgroundColor: `${b.color}25`, borderColor: b.color }]}>
                  <Text style={{ fontSize: 28 }}>
                    {b.id === "body_default" ? "🧍" : b.id === "body_athlete" ? "🏋️" : b.id === "body_ninja" ? "🥷" : b.id === "body_warrior" ? "🗡️" : "🤖"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.charItemCardName, equipped ? { color: b.color } : null]}>{b.label}</Text>
                  <Text style={styles.charItemCardDesc}>{b.desc}</Text>
                </View>
                {equipped
                  ? <View style={[styles.charItemBadgeEquipped, { backgroundColor: `${b.color}22`, borderColor: b.color }]}><Text style={[styles.charItemBadgeText, { color: b.color }]}>ON</Text></View>
                  : owned
                    ? <View style={styles.charItemBadgeOwned}><Text style={styles.charItemBadgeText}>OWNED</Text></View>
                    : <View style={styles.charItemBadgePrice}><Text style={styles.charItemPriceText}>{`${b.price} XP`}</Text></View>
                }
              </Pressable>
            );
          })}

          {/* ── WARDROBE TAB ── */}
          {tab === "wardrobe" && (
            <>
              {/* Slot selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SLOTS.map((slot) => (
                  <Pressable key={slot} onPress={() => setWardrobeSlot(slot)}
                    style={[styles.wardrobeSlotBtn, wardrobeSlot === slot ? styles.wardrobeSlotBtnActive : null]}>
                    <Text style={styles.wardrobeSlotIcon}>{slotMeta[slot].emoji}</Text>
                    <Text style={[styles.wardrobeSlotLabel, wardrobeSlot === slot ? styles.wardrobeSlotLabelActive : null]}>{slotMeta[slot].label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {filteredWardrobe.map((item) => {
                const owned = item.free || (character.ownedItems || []).includes(item.id);
                const equipped = character[item.slot] === item.id;
                return (
                  <Pressable key={item.id} onPress={() => buyAndEquipWardrobe(item)}
                    style={[styles.charItemCard, equipped ? { borderColor: COLORS.primaryLight, backgroundColor: `${COLORS.primaryLight}12` } : null]}>
                    <View style={[styles.charItemCardSwatch, { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.border }]}>
                      <Text style={{ fontSize: item.emoji && item.emoji !== "—" ? 26 : 18 }}>{item.emoji && item.emoji !== "—" ? item.emoji : "✗"}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.charItemCardName, equipped ? { color: COLORS.primaryLight } : null]}>{item.label}</Text>
                      <Text style={styles.charItemCardDesc}>{item.free ? "Free" : owned ? "Purchased" : `${item.price} XP`}</Text>
                    </View>
                    {equipped
                      ? <View style={[styles.charItemBadgeEquipped, { backgroundColor: `${COLORS.primaryLight}22`, borderColor: COLORS.primaryLight }]}><Text style={[styles.charItemBadgeText, { color: COLORS.primaryLight }]}>ON</Text></View>
                      : owned
                        ? <View style={styles.charItemBadgeOwned}><Text style={styles.charItemBadgeText}>OWNED</Text></View>
                        : <View style={styles.charItemBadgePrice}><Text style={styles.charItemPriceText}>{`${item.price} XP`}</Text></View>
                    }
                  </Pressable>
                );
              })}
            </>
          )}

          {/* ── BOOSTS TAB ── */}
          {tab === "boosts" && STAT_BOOSTS.map((boost) => {
            const owned = (character.ownedItems || []).includes(boost.id);
            const current = (character.stats || {})[boost.stat] || 0;
            return (
              <Pressable key={boost.id} onPress={() => buyStatBoost(boost)}
                style={[styles.charItemCard, owned && boost.type !== "consumable" ? { borderColor: COLORS.gold, backgroundColor: `${COLORS.gold}10` } : null]}>
                <View style={[styles.charItemCardSwatch, { backgroundColor: `${COLORS.gold}20`, borderColor: COLORS.gold }]}>
                  <Text style={{ fontSize: 26 }}>{boost.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.charItemCardName, owned ? { color: COLORS.gold } : null]}>{boost.label}</Text>
                  <Text style={styles.charItemCardDesc}>{boost.desc}</Text>
                  {current > 0 && (
                    <Text style={{ color: COLORS.neon, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                      {`Active: ${current < 1 ? `+${Math.round(current * 100)}%` : `×${current}`}`}
                    </Text>
                  )}
                </View>
                <View style={styles.charItemBadgePrice}>
                  <Text style={styles.charItemPriceText}>{`${boost.price} XP`}</Text>
                </View>
              </Pressable>
            );
          })}

        </ScrollView>
      </View>
    );
  }


  // ─── Styles ───────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    // ─ Layout
    safeArea: { flex: 1, backgroundColor: COLORS.appBg },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 52 },

    // ─ Typography
    screenTitle: { fontSize: 28, fontWeight: "900", color: COLORS.text, marginBottom: 6, letterSpacing: -0.6 },
    screenSubtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
    sectionTitle: { color: COLORS.text, fontSize: 12, fontWeight: "800", marginBottom: 8, marginTop: 12, textTransform: "uppercase", letterSpacing: 1.2 },
    sectionSubtitle: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },

    // ─ Panels / Cards
    panel: { backgroundColor: COLORS.panel, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
    inputLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 4, marginTop: 10, textTransform: "uppercase", letterSpacing: 1 },
    input: { backgroundColor: COLORS.panelAlt, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, color: COLORS.text, minHeight: 48, paddingHorizontal: 14, fontSize: 15 },

    // ─ Buttons
    primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginBottom: 8, shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
    primaryButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 14, textAlign: "center" },
    buttonPressed: { opacity: 0.8 },
    buttonDisabled: { opacity: 0.4 },
    secondaryButton: { backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.border },
    secondaryButtonText: { color: COLORS.text },

    // ─ Pills
    pillRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    pill: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: COLORS.panel },
    pillActive: { borderColor: COLORS.primaryLight, backgroundColor: "#143247" },
    pillText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
    pillTextActive: { color: COLORS.primaryLight },

    // ─ Inline buttons
    inlineButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
    inlineButton: { width: "48.5%" },

    // ─── ONBOARDING ──────────────────────────────────────────────────────────────
    onboardWrap: { flex: 1, backgroundColor: COLORS.appBg, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40, alignItems: "center", justifyContent: "center" },
    onboardGlow: { position: "absolute", top: -110, width: 360, height: 360, borderRadius: 180, alignSelf: "center" },
    onboardLogoWrap: { alignItems: "center", marginBottom: 28 },
    onboardLogoEmoji: { fontSize: 66, marginBottom: 10 },
    onboardLogoTitle: { fontSize: 42, fontWeight: "900", color: COLORS.text, letterSpacing: 6 },
    onboardLogoSub: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2.5, marginTop: 6, textTransform: "uppercase" },
    onboardPillRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 28 },
    onboardPill: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.panelAlt },
    onboardPillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
    onboardCard: { width: "100%", backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    onboardCardLabel: { color: COLORS.primaryLight, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginBottom: 12 },
    onboardInput: { backgroundColor: COLORS.panelAlt, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14, color: COLORS.text, fontSize: 22, fontWeight: "800", minHeight: 58, paddingHorizontal: 16, textAlign: "center" },
    onboardHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 10, textAlign: "center" },
    onboardLoadingNarration: { width: "100%", color: COLORS.primaryLight, fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 10, minHeight: 18, letterSpacing: 0.2 },
    onboardBtn: { width: "100%", minHeight: 58, borderRadius: 18, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    onboardBtnText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 1 },
    onboardStepHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 4 },
    onboardStepLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
    onboardBigTitle: { fontSize: 34, fontWeight: "900", color: COLORS.text, lineHeight: 42, marginBottom: 6 },
    onboardStepSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 19 },
    backChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.panel },
    backChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },

    // ─── GOAL CARDS (onboarding step 2) ─────────────────────────────────────────
    goalBigCard: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.panel, padding: 16, marginBottom: 10 },
    goalBigCardActive: { borderColor: COLORS.primaryLight, backgroundColor: "#143247" },
    goalBigIcon: { fontSize: 32, marginRight: 14 },
    goalBigLabel: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
    goalBigSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    goalBigCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },

    // ─── DASHBOARD ───────────────────────────────────────────────────────────────
    dashboardBackgroundWrap: { flex: 1 },
    dashboardBgImage: { ...StyleSheet.absoluteFillObject },
    dashboardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 13, 20, 0.38)" },
    playerHUDCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    playerHUDTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    playerAvatar: { width: 52, height: 52, borderRadius: 999, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 12 },
    playerAvatarLetter: { color: "#fff", fontSize: 22, fontWeight: "900" },
    playerHUDInfo: { flex: 1 },
    playerHUDName: { color: COLORS.text, fontSize: 19, fontWeight: "900", letterSpacing: -0.3 },
    playerHUDBadgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    levelBadge: { backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    levelBadgeText: { color: COLORS.primaryLight, fontSize: 11, fontWeight: "800" },
    armoryButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
    armoryButtonIcon: { fontSize: 18 },
    ctaButton: { minHeight: 58, borderRadius: 16, backgroundColor: COLORS.primary, marginVertical: 10, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
    ctaButtonText: { fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },

    // ─ XPBar
    xpBarWrap: { marginTop: 10 },
    xpBarLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    xpLevelText: { color: COLORS.xp, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
    xpPointsText: { color: COLORS.textMuted, fontSize: 11 },
    xpTrack: { height: 9, borderRadius: 999, backgroundColor: "#173247", overflow: "visible" },
    xpFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.xp, shadowColor: COLORS.xp, shadowOpacity: 0.6, shadowRadius: 6 },
    xpGlow: { position: "absolute", top: -4, width: 4, height: 17, borderRadius: 2, backgroundColor: "#fff", opacity: 0.6 },

    // ─ Stat cards
    statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 2 },
    statCard: { width: "48.5%", backgroundColor: COLORS.panel, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, marginBottom: 8, alignItems: "center" },
    statValue: { color: COLORS.text, fontWeight: "900", fontSize: 22 },
    statLabel: { color: COLORS.textMuted, marginTop: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },

    // ─ Ring cards
    ringRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
    ringPulseWrap: { width: "32%", minWidth: 100, marginBottom: 8 },
    ringCard: { width: "100%", backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 10, alignItems: "center" },
    ringOuter: { width: 60, height: 60, borderRadius: 999, borderWidth: 6, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    ringInner: { width: 42, height: 42, borderRadius: 999, borderWidth: 3, alignItems: "center", justifyContent: "center" },
    ringPercent: { color: COLORS.text, fontWeight: "700", fontSize: 11 },
    ringLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
    ringValue: { color: COLORS.text, fontSize: 12, fontWeight: "700", marginTop: 2 },
    ringTrack: { width: "100%", marginTop: 6, height: 4, backgroundColor: "#173247", borderRadius: 999, overflow: "hidden" },
    ringFill: { height: "100%" },

    // ─ Achievement chips
    achSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    achCountBadge: { color: COLORS.xp, fontWeight: "800", fontSize: 12 },
    achScroll: { marginBottom: 8 },
    achScrollContent: { paddingRight: 16, paddingBottom: 4 },
    achChip: { alignItems: "center", width: 76, marginRight: 8, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
    achChipUnlocked: { borderColor: "#0ea5e9", backgroundColor: "#0a2135" },
    achChipLocked: { opacity: 0.45 },
    achIcon: { fontSize: 22, marginBottom: 4 },
    achName: { color: COLORS.textMuted, fontSize: 9, fontWeight: "700", textAlign: "center" },
    achNameUnlocked: { color: COLORS.xp },

    // ─ Achievement wall (progress screen)
    achWall: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
    achWallCard: { width: "48.5%", backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, marginBottom: 8, alignItems: "center", opacity: 0.5 },
    achWallCardUnlocked: { borderColor: "#0ea5e9", backgroundColor: "#0a2135", opacity: 1 },
    achWallIcon: { fontSize: 28, marginBottom: 6 },
    achWallName: { color: COLORS.textMuted, fontSize: 12, fontWeight: "800", textAlign: "center" },
    achWallNameUnlocked: { color: COLORS.xp },
    achWallDesc: { color: COLORS.textMuted, fontSize: 10, textAlign: "center", marginTop: 4, lineHeight: 14 },

    // ─ Streak badge
    streakBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#301704", borderWidth: 1, borderColor: "#9a4210", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
    streakIcon: { fontSize: 12 },
    streakText: { color: COLORS.streak, fontWeight: "900", fontSize: 13, marginHorizontal: 3 },
    streakLabel: { color: "#f08a4b", fontSize: 10, fontWeight: "600" },

    // ─── DAY SELECTION ────────────────────────────────────────────────────────────
    daySelectBackgroundWrap: { flex: 1 },
    daySelectBgImage: { ...StyleSheet.absoluteFillObject },
    daySelectBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6, 18, 27, 0.72)" },
    dayTopBackButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
    dayTopBackButtonText: { color: COLORS.text, fontSize: 22, fontWeight: "900" },
    dayPlanOverline: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
    dayPlanTitle: { color: COLORS.text, fontSize: 26, fontWeight: "900", lineHeight: 30, marginTop: 4 },
    dayPlanSubtitle: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 12 },
    dayBannerCard: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primaryLight, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 },
    dayBannerEyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", marginBottom: 4 },
    dayBannerTitle: { color: "#fff", fontSize: 26, fontWeight: "900", lineHeight: 28 },
    dayBannerMeta: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 6 },
    dayStageTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 8 },
    dayTimelineWrap: { marginBottom: 10 },
    dayTimelineRow: { flexDirection: "row", alignItems: "stretch", marginBottom: 8 },
    dayRailColumn: { width: 24, alignItems: "center" },
    dayRailLine: { width: 2, flex: 1, backgroundColor: COLORS.border },
    dayRailSpacer: { width: 2, flex: 1, backgroundColor: "transparent" },
    dayRailDot: { width: 14, height: 14, borderRadius: 999, borderWidth: 2, borderColor: COLORS.primaryLight, backgroundColor: COLORS.panelAlt, marginVertical: 2 },
    dayRailDotActive: { backgroundColor: COLORS.primaryLight, borderColor: "#c084fc" },
    dayRailDotCompleted: { backgroundColor: COLORS.success, borderColor: "#34d399" },
    dayRailDotLocked: { borderColor: "#3d2f5c", backgroundColor: "#1a0e2e" },
    dayTimelineCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, padding: 12, minHeight: 100 },
    dayTimelineCardActive: { borderColor: COLORS.primaryLight, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
    dayTimelineCardCompleted: { borderColor: COLORS.success },
    dayTimelineCardLocked: { opacity: 0.55 },
    dayStatusPill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#173247", color: COLORS.textMuted, fontSize: 10, fontWeight: "700", marginBottom: 6, overflow: "hidden" },
    dayStatusPillActive: { backgroundColor: "#143247", color: COLORS.primaryLight },
    dayStatusPillCompleted: { backgroundColor: "#0d2d1e", color: "#34d399" },
    dayStatusPillLocked: { backgroundColor: "#132535", color: "#617d92" },
    dayTimelineCardTop: { flexDirection: "row", alignItems: "center" },
    dayTimelineCardTextWrap: { flex: 1, marginRight: 8 },
    dayTimelineCardTitle: { color: COLORS.text, fontSize: 24, lineHeight: 28, fontWeight: "900" },
    dayTimelineCardTitleLocked: { color: "#617d92" },
    dayTimelineCardMeta: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 3 },
    dayTimelineCardSubMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
    dayStartButton: { marginTop: 10, borderRadius: 12, backgroundColor: COLORS.primary, minHeight: 40, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8 },
    dayStartButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

    // ─── WORKOUT TYPE ─────────────────────────────────────────────────────────────
    workoutSelectScreen: { flex: 1, backgroundColor: COLORS.appBg },
    workoutSelectBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    workoutSelectOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,18,27,0.86)" },
    workoutTopBackButton: { position: "absolute", top: 16, left: 16, zIndex: 10, width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
    workoutTopBackButtonText: { color: "#fff", fontSize: 22, fontWeight: "900" },
    workoutSelectContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 60 },
    workoutChooseTitle: { color: "#fff", fontSize: 34, fontWeight: "900", textAlign: "center", lineHeight: 40, marginBottom: 6, letterSpacing: 1 },
    workoutSelectOneLabel: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 2.5, fontWeight: "700", marginBottom: 28 },
    workoutCardsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%" },
    workoutArrowBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    workoutArrowText: { color: "#fff", fontSize: 26, fontWeight: "900" },
    workoutTypeCardWrap: { marginHorizontal: 10 },
    workoutTypeCard: { width: 136, height: 136, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 2 },
    workoutTypeCardActive: { borderColor: COLORS.primaryLight, backgroundColor: "rgba(20,184,166,0.2)", shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
    workoutTypeCardInactive: { borderColor: COLORS.border, backgroundColor: "rgba(12,29,43,0.8)" },
    workoutTypeCardIcon: { width: 82, height: 82 },
    workoutTypeCardIconInactive: { opacity: 0.4 },

    // ─── EXERCISE SELECTION ───────────────────────────────────────────────────────
    selectionSummaryCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.panelAlt, padding: 14, marginBottom: 10 },
    selectionSummaryEyebrow: { color: COLORS.primaryLight, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
    selectionSummaryTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
    selectionSummaryText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
    exercisePickCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.panel, padding: 13, marginBottom: 8, flexDirection: "row", alignItems: "center" },
    exercisePickCardActive: { borderColor: COLORS.success, backgroundColor: "#0a1e16" },
    exercisePickMain: { flex: 1, marginRight: 10 },
    selectedMark: { color: COLORS.success, fontWeight: "700", fontSize: 14 },
    choiceCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, borderRadius: 14, padding: 13, marginBottom: 8 },
    choiceCardActive: { borderColor: COLORS.primaryLight, backgroundColor: "#143247" },
    choiceTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
    choiceTitleActive: { color: COLORS.primaryLight },
    choiceSubtitle: { color: COLORS.textMuted, marginTop: 4, fontSize: 12, lineHeight: 17 },
    topicCardPressArea: { width: "100%" },
    topicCardTopRow: { flexDirection: "row", alignItems: "center" },
    topicCardTextWrap: { flex: 1, marginRight: 10 },
    topicStartButton: { marginTop: 10, marginBottom: 0, minHeight: 42, borderRadius: 12, backgroundColor: COLORS.primary },
    topicStartButtonText: { fontSize: 14, fontWeight: "800" },

    // ─── ACTIVE SESSION ───────────────────────────────────────────────────────────
    sessionMetaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
    metaBadge: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, color: COLORS.text, marginRight: 8, marginBottom: 8, fontSize: 11, backgroundColor: COLORS.panel },
    sessionCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.panel, padding: 14 },
    sessionExerciseTitle: { color: COLORS.text, fontWeight: "900", fontSize: 20 },
    sessionExerciseSubtitle: { color: COLORS.textMuted, marginTop: 4, fontSize: 12, lineHeight: 18 },
    exerciseMedia: { width: "100%", height: 210, borderRadius: 14, marginTop: 12, backgroundColor: "#fff" },
    exerciseMediaJumpingJacks: { height: 180 },
    exerciseMediaMountainClimbers: { height: 180 },
    mediaFallback: { width: "100%", height: 210, borderRadius: 14, marginTop: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.border },
    mediaFallbackText: { color: COLORS.textMuted, fontWeight: "700" },
    timerWrap: { marginTop: 12, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.border },
    timerValue: { color: COLORS.text, fontSize: 52, fontWeight: "900" },
    timerLabel: { color: COLORS.textMuted, marginTop: 2, fontSize: 12 },
    controlRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    controlButton: { width: "32%" },
    controlButtonDanger: { width: "32%", backgroundColor: "#1e0a0a", borderWidth: 1, borderColor: COLORS.danger },
    controlButtonDangerText: { color: COLORS.danger },

    // ─── QUIZ ─────────────────────────────────────────────────────────────────────
    quizHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    quizCounter: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
    audioButton: { minHeight: 36, paddingHorizontal: 12, marginBottom: 0 },
    audioButtonText: { fontSize: 12 },
    quizCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.panel, padding: 14 },
    quizPrompt: { color: COLORS.text, fontSize: 18, fontWeight: "700", lineHeight: 26, marginBottom: 14 },
    answerRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8, backgroundColor: COLORS.panelAlt },
    answerRowCorrect: { borderColor: COLORS.success, backgroundColor: "#081e12" },
    answerRowWrong: { borderColor: COLORS.danger, backgroundColor: "#1e0a0a" },
    answerLetter: { color: COLORS.primaryLight, fontWeight: "800", width: 24, textAlign: "center", marginRight: 8 },
    answerText: { color: COLORS.text, fontSize: 13, flex: 1, lineHeight: 18 },
    answerTextCorrect: { color: COLORS.success, fontWeight: "700" },
    answerTextWrong: { color: COLORS.danger, fontWeight: "700" },
    voiceBox: { marginTop: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, borderRadius: 16, padding: 14 },
    voiceTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
    voiceHelp: { color: COLORS.textMuted, marginTop: 4, marginBottom: 8, fontSize: 12, lineHeight: 18 },
    voiceInput: { backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, color: COLORS.text, minHeight: 48, textAlign: "center", fontSize: 20, fontWeight: "700", marginBottom: 8 },

    // ─── SUMMARY ─────────────────────────────────────────────────────────────────
    summaryPointsCard: { backgroundColor: "#0a2135", borderWidth: 1.5, borderColor: COLORS.primaryLight, borderRadius: 18, padding: 18, marginBottom: 14, alignItems: "center", shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 16 },
    summaryPointsTotal: { fontSize: 40, fontWeight: "900", color: COLORS.primaryLight, letterSpacing: -1 },
    summaryPointsBreakdown: { width: "100%", marginTop: 12 },
    summaryPointLine: { color: COLORS.textMuted, fontSize: 13, marginBottom: 3 },
    summaryPointBonus: { color: COLORS.gold, fontSize: 13, fontWeight: "700", marginBottom: 3 },
    summaryLevelCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 10 },
    levelUpBanner: { backgroundColor: "#0a2135", borderWidth: 1, borderColor: COLORS.xp, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: "center" },
    levelUpText: { color: COLORS.xp, fontWeight: "900", fontSize: 15 },
    progressLine: { color: COLORS.text, marginBottom: 6, fontSize: 13 },
    levelTrack: { height: 9, borderRadius: 999, backgroundColor: "#173247", overflow: "hidden", marginTop: 6 },
    levelFill: { height: "100%", backgroundColor: COLORS.xp },
    levelHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
    summaryStreakCard: { backgroundColor: "#1c0800", borderWidth: 1, borderColor: "#7a3000", borderRadius: 14, padding: 12, marginBottom: 10, alignItems: "center" },
    summaryStreakText: { color: COLORS.streak, fontWeight: "700", fontSize: 14 },
    summaryAchCard: { backgroundColor: "#0a2135", borderWidth: 1, borderColor: "#0ea5e9", borderRadius: 18, padding: 16, marginBottom: 10 },
    summaryAchTitle: { color: COLORS.xp, fontWeight: "900", fontSize: 15, marginBottom: 12 },
    summaryAchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    summaryAchIcon: { fontSize: 26, marginRight: 12 },
    summaryAchName: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
    summaryAchDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

    // ─── PROGRESS SCREEN ─────────────────────────────────────────────────────────
    progressLevelCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 12 },
    progressLevelTitle: { color: COLORS.text, fontSize: 20, fontWeight: "900", marginBottom: 10 },
    progressMiniStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
    progressMiniStat: { alignItems: "center" },
    progressMiniStatValue: { color: COLORS.text, fontSize: 22, fontWeight: "900" },
    progressMiniStatLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

    // ─── ARMORY MODAL ─────────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
    armoryContainer: { backgroundColor: COLORS.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: "72%", borderWidth: 1, borderColor: COLORS.border },
    armoryTitle: { color: COLORS.text, fontSize: 20, fontWeight: "900", marginBottom: 4 },
    pointsText: { color: COLORS.xp, fontSize: 13, fontWeight: "700", marginBottom: 16 },
    shopItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 13, marginBottom: 8, backgroundColor: COLORS.panelAlt },
    itemName: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
    itemDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    itemPrice: { color: COLORS.gold, fontWeight: "800", fontSize: 14 },

    // ─── GOAL CARD (dashboard goal cards, kept for compat) ───────────────────────
    goalCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.panel, padding: 13, marginBottom: 8 },
    goalCardActive: { borderColor: COLORS.success, backgroundColor: "#081e12" },
    goalTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
    goalTitleActive: { color: COLORS.success },
    goalSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

    // ─── CHARACTER SCREEN ─────────────────────────────────────────────────────────
    charHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: COLORS.appBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    charBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
    charBackBtnText: { color: COLORS.text, fontSize: 20, fontWeight: "900" },
    charHeaderTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", letterSpacing: 1.5 },
    charXPBadge: { backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    charXPText: { color: COLORS.xp, fontSize: 12, fontWeight: "800" },

    charStage: { alignItems: "center", justifyContent: "center", paddingVertical: 20, paddingHorizontal: 20, position: "relative", minHeight: 240 },
    charStageGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: "50%", marginTop: -110, shadowOpacity: 0.5, shadowRadius: 40, elevation: 0 },
    charBoostRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 },
    charBoostPill: { backgroundColor: "#2e1d4a", borderWidth: 1, borderColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    charBoostPillText: { color: COLORS.xp, fontSize: 11, fontWeight: "800" },

    charTabBar: { flexDirection: "row", backgroundColor: COLORS.panel, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
    charTabItem: { flex: 1, alignItems: "center", paddingVertical: 10, position: "relative" },
    charTabItemActive: { backgroundColor: "#1a1030" },
    charTabIcon: { fontSize: 18, marginBottom: 2 },
    charTabLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
    charTabLabelActive: { color: COLORS.primaryLight },
    charTabIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, backgroundColor: COLORS.primaryLight, borderRadius: 999 },

    charItemCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 13, marginBottom: 9, backgroundColor: COLORS.panel },
    charItemCardSwatch: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    charItemCardName: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
    charItemCardDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    charItemBadgeEquipped: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    charItemBadgeOwned: { backgroundColor: "#1e1530", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    charItemBadgePrice: { backgroundColor: "#1f1000", borderWidth: 1, borderColor: COLORS.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    charItemBadgeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800" },
    charItemPriceText: { color: COLORS.gold, fontSize: 11, fontWeight: "900" },

    wardrobeSlotBtn: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
    wardrobeSlotBtnActive: { borderColor: COLORS.primaryLight, backgroundColor: "#2e1d4a" },
    wardrobeSlotIcon: { fontSize: 18, marginBottom: 2 },
    wardrobeSlotLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
    wardrobeSlotLabelActive: { color: COLORS.primaryLight },

    // ─── SETUP (legacy – kept for compat) ────────────────────────────────────────
    setupHero: { alignItems: "center", paddingVertical: 40, marginBottom: 8 },
    setupGlowRing: { position: "absolute", width: 180, height: 180, borderRadius: 999, backgroundColor: COLORS.primary, top: 10 },
    setupLogoIcon: { fontSize: 48, marginBottom: 12, zIndex: 1 },
    setupLogoTitle: { fontSize: 38, fontWeight: "900", color: COLORS.text, letterSpacing: 4, zIndex: 1 },
    setupLogoTagline: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginTop: 6, textAlign: "center", zIndex: 1 },
    setupFeatureRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 20 },
    setupFeaturePill: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.panel },
    setupFeaturePillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
    setupInputCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18, marginBottom: 14 },
    setupInputEyebrow: { color: COLORS.primaryLight, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
    setupInput: { backgroundColor: COLORS.panelAlt, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, color: COLORS.text, fontSize: 20, fontWeight: "700", minHeight: 52, paddingHorizontal: 14, textAlign: "center" },
    setupInputHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" },
    setupStartButton: { minHeight: 54, borderRadius: 16, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 12 },
    setupStartButtonText: { fontSize: 16, fontWeight: "900", letterSpacing: 1 },

    // ─── STAT PREVIEW (character preview in dashboard) ────────────────────────────
    charPreviewCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, marginBottom: 14 },
    charPreviewName: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
    charPreviewSub: { color: COLORS.xp, fontSize: 12, fontWeight: "700", marginTop: 2 },
    charStatLine: { color: COLORS.neon, fontSize: 11, fontWeight: "700", marginTop: 2 },
    charTabRow: { flexDirection: "row", marginBottom: 12, gap: 6 },
    charTab: { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: COLORS.panel },
    charTabActive: { borderColor: COLORS.primaryLight, backgroundColor: "#1f1235" },
    charTabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
    charTabTextActive: { color: COLORS.primaryLight },
    charShopItem: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 8, backgroundColor: COLORS.panelAlt },
    charItemName: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
    charItemDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    charItemPrice: { color: COLORS.gold, fontWeight: "800", fontSize: 13 },
    charEquipBadge: { color: COLORS.textMuted, fontWeight: "800", fontSize: 11, marginLeft: 6 },
  });