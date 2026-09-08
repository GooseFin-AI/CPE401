# Multi-Agent: An Auditable Financial Data and Investment Intelligence Platform

> **CPE 401 — Computer Engineering Project**
>
> An academic project focused on building an auditable financial data and investment intelligence platform powered by AI agents.

## Overview

Financial information is distributed across many sources, changes over time, and can be difficult to compare consistently. At the same time, AI-generated investment insights are only useful when users can understand where the information came from and how the conclusion was formed.

This project explores a modular platform that combines financial data workflows, specialized AI agents, and an accessible user interface. The system is designed to help users research financial information, evaluate investment-related criteria, and communicate insights with a transparent record of sources, transformations, and agent outputs.

> **Important:** This project is an academic prototype for CPE 401. It is intended for learning, experimentation, and decision support — not as financial advice or a substitute for professional judgment.

## Project Objectives

- Design a modular architecture for financial data and AI-agent workflows.
- Build agents that can research, organize, analyze, and explain financial information.
- Preserve an audit trail containing data sources, timestamps, processing steps, and generated outputs.
- Present financial intelligence through a clear and usable frontend.
- Apply software engineering practices including version control, testing, documentation, and collaborative development.

## Core Concept

The platform is organized around a group of cooperating agents rather than one opaque model. Each agent has a focused responsibility, while the platform records the evidence and intermediate context needed to make the final result easier to inspect.
