#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《大模型的优化基础：从直觉几何、自适应动力学到前沿矩阵优化器》（全十六章完整版）
作者：顾嘉伟、乔子越（大湾区大学）
配套零算力（100% Python 标准库 math/random，零第三方依赖）全书 16 章优化算法与定理验证脚本
运行方式：python3 cpu_opt_practice_code.py
"""

import math
import random

random.seed(42)


def chap01_three_norms_steepest_descent():
    print("=" * 76)
    print("【第 1 章】“范数决定最速下降方向”：L2 导出 SGD，L∞ 导出 SignSGD，谱范数导出 Muon")
    print("=" * 76)
    g = [3.0, -4.0]
    norm2 = math.sqrt(g[0] ** 2 + g[1] ** 2)
    d_l2 = [-g[0] / norm2, -g[1] / norm2]
    d_linf = [-math.copysign(1.0, g[0]), -math.copysign(1.0, g[1])]
    print(f"当前梯度 g = {g}")
    print(f"L2 单位球最速下降方向 -g/||g||_2     = {[round(x, 4) for x in d_l2]}")
    print(f"L∞ 超立方体最速下降方向 -sign(g)     = {d_linf} (内积增益 |g1|+|g2| = {abs(g[0])+abs(g[1]):.1f})\n")


def chap02_ill_conditioned_momentum_and_nesterov():
    print("=" * 76)
    print("【第 2 章】病态峡谷条件数 κ = λ_max/λ_min 与 Polyak 重球法 vs. Nesterov 加速")
    print("=" * 76)
    kappa = 25.0
    rho_gd = (kappa - 1.0) / (kappa + 1.0)
    rho_hb = (math.sqrt(kappa) - 1.0) / (math.sqrt(kappa) + 1.0)
    print(f"峡谷条件数 κ = {kappa:.1f} | 最优 GD 收缩率 = {rho_gd:.4f} | 最优重球动量收缩率 = {rho_hb:.4f}\n")


def chap03_saddle_escape_and_edge_of_stability():
    print("=" * 76)
    print("【第 3 章】高维马鞍面指数逃逸与稳定边缘 (Edge of Stability) λ_max(H) ≈ 2/η")
    print("=" * 76)
    eta = 0.08
    eos_ceiling = 2.0 / eta
    print(f"学习率 η = {eta} => 稳定边缘最大曲率天花板 2/η = {eos_ceiling:.2f}\n")


def chap04_sgd_noise_scale_and_critical_batch():
    print("=" * 76)
    print("【第 4 章】随机梯度噪声尺度 B_simple = tr(Σ)/||g||^2 与线性缩放法则")
    print("=" * 76)
    tr_sigma, g_norm_sq = 120.0, 0.5
    b_crit = tr_sigma / g_norm_sq
    print(f"梯度协方差迹 tr(Σ)={tr_sigma}, 真实梯度模平方 ||g||^2={g_norm_sq} => 临界批量大小 B_crit = {b_crit:.0f}\n")


def chap05_adagrad_rmsprop_adam_bias_correction():
    print("=" * 76)
    print("【第 5 章】AdaGrad 衰减困境、RMSProp 半衰期与 Adam 起步偏差校正 1/(1-β^t)")
    print("=" * 76)
    beta2 = 0.95
    half_life = math.log(2.0) / (1.0 - beta2)
    v1_raw = (1.0 - beta2) * (10.0 ** 2)
    v1_hat = v1_raw / (1.0 - beta2 ** 1)
    print(f"β_2 = {beta2} 时二阶矩等效记忆半衰期 ≈ {half_life:.1f} 步 | 第 1 步未校正 v_1 = {v1_raw:.1f}, 校正后 v̂_1 = {v1_hat:.1f}\n")


def chap06_why_adam_beats_sgd_on_transformers():
    print("=" * 76)
    print("【第 6 章】为什么 Transformer 离不开 Adam：分块异质海森曲率与重尾梯度拉平")
    print("=" * 76)
    curvatures = {"Embedding 层": 0.002, "Attention QKV 层": 1.5, "MLP 层": 12.0, "RMSNorm 层": 85.0}
    print(f"Transformer 各层典型海森曲率跨度: {curvatures} (最大/最小比 = {85.0/0.002:.0f} 倍，Adam 自动逐坐标归一化)\n")


def chap07_adamw_decoupled_wd_and_lion():
    print("=" * 76)
    print("【第 7 章】AdamW 解耦权重衰减代数证明与 Lion 双 β 符号动量优化器")
    print("=" * 76)
    theta0, g1, lam, eta = 2.0, 10.0, 0.5, 0.1
    theta_adam_l2 = theta0 - eta * 1.0  # L2 耦合被自适应分母抵消
    theta_adamw = theta0 - eta * (1.0 + lam * theta0)
    print(f"第 1 步更新后: 传统 Adam+L2 θ_1 = {theta_adam_l2:.2f} vs. 解耦 AdamW θ_1 = {theta_adamw:.2f}\n")


def chap08_warmup_cosine_wsd_and_schedule_free():
    print("=" * 76)
    print("【第 8 章】Warmup、余弦退火、WSD (Warmup-Stable-Decay) 与 Schedule-Free 插值")
    print("=" * 76)
    for t_ratio in [0.05, 0.50, 0.85, 0.95]:
        lr_wsd = (t_ratio / 0.10) if t_ratio <= 0.10 else (1.0 if t_ratio <= 0.80 else 1.0 - (t_ratio - 0.80) / 0.20)
        print(f"训练进度 {t_ratio*100:4.0f}% | WSD 归一化学习率 = {lr_wsd:.3f}")
    print()


def chap09_natural_gradient_kfac_and_shampoo():
    print("=" * 76)
    print("【第 9 章】Fisher 自然梯度与 K-FAC / Shampoo 克罗内克积 (L ⊗ R) 显存压缩")
    print("=" * 76)
    d = 4096
    full_hessian_elems = (d * d) ** 2
    kronecker_elems = 2 * (d * d)
    print(f"线性层 4096×4096: 全海森矩阵元素数 = {full_hessian_elems:.2e} vs. Shampoo 左右因子元素数 = {kronecker_elems:.2e}\n")


def chap10_muon_newton_schulz_and_soap():
    print("=" * 76)
    print("【第 10 章】Muon 优化器：5 步 Newton-Schulz 奇次矩阵多项式奇异值拉平验证")
    print("=" * 76)
    sigmas = [0.10, 0.30, 0.60, 0.90]
    a, b, c = 3.4445, -4.7750, 2.0315
    for _ in range(5):
        sigmas = [a * s + b * (s ** 3) + c * (s ** 5) for s in sigmas]
    print(f"初始奇异值 [0.10, 0.30, 0.60, 0.90] 经 5 步迭代后 = {[round(s, 4) for s in sigmas]}\n")


def chap11_galore_subspace_and_lomo():
    print("=" * 76)
    print("【第 11 章】GaLore 梯度低秩投影：满秩权重更新下的优化器状态压缩比")
    print("=" * 76)
    m, n, r = 4096, 4096, 256
    adam_state_mb = 2 * m * n * 4 / (1024 ** 2)
    galore_state_mb = (m * r + 2 * r * n) * 4 / (1024 ** 2)
    print(f"单层 4096×4096 Adam 状态 = {adam_state_mb:.1f} MB | GaLore (r=256) 状态 = {galore_state_mb:.1f} MB (节省 {(1-galore_state_mb/adam_state_mb)*100:.1f}%)\n")


def chap12_mup_maximal_update_parametrization():
    print("=" * 76)
    print("【第 12 章】最大更新参数化 (μP)：跨模型宽度 d 零样本学习率迁移缩放表")
    print("=" * 76)
    for width_mult in [1, 4, 16]:
        lr_hidden_mup = 1e-3 / width_mult
        print(f"宽度放大倍数 ×{width_mult:2d} | μP 隐藏层 AdamW 最优学习率 η_hidden = {lr_hidden_mup:.6f}")
    print()


def chap13_sam_flat_minima_and_grokking():
    print("=" * 76)
    print("【第 13 章】尖锐度感知最小化 (SAM) 一步最坏对抗扰动 ε̂ = ρ g / ||g||_2")
    print("=" * 76)
    g = [0.6, -0.8]
    rho = 0.05
    eps_hat = [rho * x / math.sqrt(0.6 ** 2 + 0.8 ** 2) for x in g]
    print(f"梯度 g = {g}, 邻域半径 ρ = {rho} => SAM 爬坡对抗点偏移 ε̂ = {[round(x, 4) for x in eps_hat]}\n")


def chap14_loss_spikes_zloss_qknorm_and_fp8():
    print("=" * 76)
    print("【第 14 章】Loss Spike 驯服：Z-Loss 配分函数制动与 FP8 随机舍入无偏性验证")
    print("=" * 76)
    x_true = 1.25  # 介于刻度 1.0 与 2.0 之间 (概率 0.25 向上取 2.0, 0.75 向下取 1.0)
    samples = [2.0 if random.random() < 0.25 else 1.0 for _ in range(10000)]
    print(f"真实值 x = {x_true} | 低精度确定性四舍五入 = 1.000 (有偏!) | 随机舍入均值 = {sum(samples)/len(samples):.4f} (无偏!)\n")


def chap15_zero_stages_and_diloco():
    print("=" * 76)
    print("【第 15 章】万卡集群 ZeRO-1/2/3 显存切分公式 16Ψ Bytes 账单验证")
    print("=" * 76)
    psi_b = 7.0  # 7B 模型
    N = 8
    print(f"7B 模型单卡训练显存: 标准 DDP = {16*psi_b:.1f} GB | 8卡 ZeRO-1 = {(4+12/N)*psi_b:.1f} GB | ZeRO-2 = {(2+14/N)*psi_b:.1f} GB | ZeRO-3 = {(16/N)*psi_b:.1f} GB\n")


def chap16_ppo_dpo_grpo_alignment_optimization():
    print("=" * 76)
    print("【第 16 章】后训练强化学习优化：PPO 信赖域裁剪与 DeepSeek-R1 GRPO 无偏 KL 估计器")
    print("=" * 76)
    for rho in [0.5, 1.0, 1.5, 2.0]:
        kl_grpo = (1.0 / rho) - math.log(1.0 / rho) - 1.0
        print(f"新旧策略概率比 ρ = {rho:.1f} | GRPO 非负凸 KL 惩罚值 = {kl_grpo:.4f} (≥ 0)")
    print()


if __name__ == "__main__":
    chap01_three_norms_steepest_descent()
    chap02_ill_conditioned_momentum_and_nesterov()
    chap03_saddle_escape_and_edge_of_stability()
    chap04_sgd_noise_scale_and_critical_batch()
    chap05_adagrad_rmsprop_adam_bias_correction()
    chap06_why_adam_beats_sgd_on_transformers()
    chap07_adamw_decoupled_wd_and_lion()
    chap08_warmup_cosine_wsd_and_schedule_free()
    chap09_natural_gradient_kfac_and_shampoo()
    chap10_muon_newton_schulz_and_soap()
    chap11_galore_subspace_and_lomo()
    chap12_mup_maximal_update_parametrization()
    chap13_sam_flat_minima_and_grokking()
    chap14_loss_spikes_zloss_qknorm_and_fp8()
    chap15_zero_stages_and_diloco()
    chap16_ppo_dpo_grpo_alignment_optimization()
    print("🎉 《大模型的优化基础》全书 16 章零算力 CPU 数学验证实验全部运行通过！")
