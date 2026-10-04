/**
 * Basic programming language detector using syntax heuristics
 */
export const detectLanguage = (code, fileName = '') => {
  if (fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const extMap = {
      js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp', cxx: 'cpp', cc: 'cpp', h: 'c', c: 'c',
      cs: 'csharp',
      go: 'go',
      rb: 'ruby',
      php: 'php',
      html: 'html', css: 'css', json: 'json',
      sh: 'shell', bash: 'shell'
    };
    if (extMap[ext]) return extMap[ext];
  }

  // Fallback: analyze code contents for keyword fingerprints
  const lines = code.slice(0, 1000); // Check first 1000 characters

  if (lines.includes('import React') || lines.includes('const ') || lines.includes('let ') || lines.includes('console.log')) {
    if (lines.includes('interface ') || lines.includes('type ') || lines.includes(': string') || lines.includes(': any')) {
      return 'typescript';
    }
    return 'javascript';
  }

  if (lines.includes('def ') && (lines.includes('import ') || lines.includes('print('))) {
    return 'python';
  }

  if (lines.includes('public class ') && lines.includes('public static void main')) {
    return 'java';
  }

  if (lines.includes('#include <') || lines.includes('std::cout')) {
    return 'cpp';
  }

  if (lines.includes('using System;') || lines.includes('namespace ') && lines.includes('class ')) {
    return 'csharp';
  }

  if (lines.includes('package main') && lines.includes('func ')) {
    return 'go';
  }

  if (lines.includes('<?php')) {
    return 'php';
  }

  if (lines.includes('require ') && lines.includes('def ')) {
    return 'ruby';
  }

  if (lines.includes('<!DOCTYPE html>') || lines.includes('<html')) {
    return 'html';
  }

  return 'javascript'; // Default fallback
};

export const getLanguageBadgeColor = (lang) => {
  const colors = {
    javascript: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    typescript: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    python: 'bg-green-500/20 text-green-300 border-green-500/30',
    java: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    cpp: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    csharp: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    go: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    php: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    ruby: 'bg-red-500/20 text-red-300 border-red-500/30'
  };
  return colors[lang.toLowerCase()] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};
