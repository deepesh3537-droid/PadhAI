# Model Benchmarks — Phase 0

> Record candidate model evaluations on the target development machine.
> Refer to `PRD.md §5` and `TEST_PLAN.md §13`.

---

## 1. Hardware Specifications

| Property | Value | Notes |
|---|---|---|
| OS | Windows 11 Home Single Language (64-bit, Build 10.0.26200) | Verified via `Win32_OperatingSystem` |
| System RAM | 8 GB (7.42 GB visible) | Dev machine constraint |
| GPU Model | NVIDIA GeForce GTX 1650 (+ AMD Radeon Graphics) | Driver 566.07, CUDA 12.7 supported |
| Dedicated VRAM | 4096 MiB (4 GB) | Verified via `nvidia-smi` |

---

## 2. Benchmark Candidates

### Candidate: Qwen3-0.6B

- **Exact Tag:** `qwen3:0.6b` (ID: `7df6b6e09427`)
- **Source/Library:** Ollama library (`qwen3:0.6b`, GGUF format)
- **License:** Apache License 2.0 (Alibaba Cloud)
- **Commercial Use Terms:** Permissive open source; commercial use permitted
- **Model Size / VRAM Footprint:** 522 MB (751.63M parameters, Q4_K_M quantization; easily resides in 4 GB VRAM)
- **Generation Speed:** 130.4 tokens/sec (evaluated over 17,289 tokens on GTX 1650 CUDA)
- **Schema/JSON Validity Rate:** 100% (20/20 valid JSON outlines conforming to schema)
- **Quality Assessment:** Excellent. Produced relevant, modular curricula with measurable objectives across beginner, intermediate, and advanced topics without hallucinations or formatting breakdown.

---

## 3. Decision

- [x] Approved for Milestone 1 (`qwen3:0.6b` chosen as primary local model)
- [ ] Alternative candidate required
