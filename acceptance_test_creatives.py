#!/usr/bin/env python3
"""素材审核功能全流程验收脚本（本地环境）"""
import json
import os
import subprocess
import time
import zipfile

import requests

BASE = "http://localhost:3001"
SERVER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server")
TMP = "/tmp/acceptance_assets"
RESULTS = []  # (编号, 用例, 通过, 备注)

server_proc = None


def start_server(tag=""):
    global server_proc
    server_proc = subprocess.Popen(
        ["npx", "tsx", "src/index.ts"],
        cwd=SERVER_DIR,
        stdout=open("/tmp/acceptance_server.log", "a"),
        stderr=subprocess.STDOUT,
    )
    for _ in range(30):
        try:
            if requests.get(BASE + "/health", timeout=2).status_code == 200:
                return True
        except Exception:
            time.sleep(1)
    return False


def stop_server():
    global server_proc
    if server_proc:
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except Exception:
            server_proc.kill()
        server_proc = None
    subprocess.run("lsof -ti:3001 | xargs kill -9 2>/dev/null", shell=True)
    time.sleep(1)


def check(case_id, name, ok, note=""):
    RESULTS.append((case_id, name, bool(ok), note))
    print(f"[{'PASS' if ok else 'FAIL'}] {case_id} {name} {('- ' + note) if note else ''}")


def login(username, password):
    r = requests.post(BASE + "/api/v1/auth/login", json={"username": username, "password": password}, timeout=10)
    try:
        body = r.json()
    except Exception:
        return r.status_code, None
    token = (body.get("data") or {}).get("token")
    return r.status_code, token


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_assets():
    os.makedirs(TMP, exist_ok=True)
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d4944415478da63fccfc105000f00e105ab040000000049454e44ae426082"
    )
    for name in ["a1.png", "a2.png", "a3.png", "b1.png", "b2.png"]:
        with open(os.path.join(TMP, name), "wb") as f:
            f.write(png)
    with open(os.path.join(TMP, "note.txt"), "w") as f:
        f.write("not media")
    with zipfile.ZipFile(os.path.join(TMP, "pack.zip"), "w") as z:
        z.writestr("z1.png", png)
        z.writestr("z2.png", png)
        z.writestr("readme.txt", "skip me")


def upload(token, files, channel, campaign_id=None):
    data = {"channel": channel}
    if campaign_id:
        data["campaignId"] = campaign_id
    with requests.Session() as s:
        return s.post(
            BASE + "/api/v1/creatives/upload",
            headers=auth(token),
            files=[("files", (os.path.basename(p), open(p, "rb"))) for p in files],
            data=data,
            timeout=60,
        )


def list_ids(token, **params):
    r = requests.get(BASE + "/api/v1/creatives/list", headers=auth(token), params=params, timeout=10)
    return r.json()["data"]


def main():
    os.makedirs("/tmp", exist_ok=True)
    open("/tmp/acceptance_server.log", "w").close()
    make_assets()
    created_ids = []
    agent_created = False

    if not start_server():
        print("FATAL: backend failed to start")
        return

    try:
        # ===== A. 鉴权 =====
        code, admin_token = login("admin", "admin123")
        check("A1", "管理员登录", code == 200 and admin_token, f"HTTP {code}")
        code, _ = login("admin", "wrong_password")
        check("A2", "错误密码被拒绝", code in (400, 401), f"HTTP {code}")
        r = requests.get(BASE + "/api/v1/creatives/list", timeout=10)
        check("A3", "无 token 访问被拒绝", r.status_code == 401, f"HTTP {r.status_code}")

        # 创建渠道测试用户 test_agent（权限渠道 ximalaya）
        r = requests.post(BASE + "/api/v1/user/users", headers=auth(admin_token),
                          json={"username": "test_agent", "password": "test123456", "role": "channel_user",
                                "permittedChannels": ["ximalaya"]}, timeout=10)
        agent_created = r.status_code in (200, 201)
        if not agent_created:
            # 可能已存在，直接登录
            pass
        code, agent_token = login("test_agent", "test123456")
        check("A4", "渠道测试用户登录", code == 200 and agent_token, f"HTTP {code}")

        # ===== B. 渠道清单 =====
        r = requests.get(BASE + "/api/v1/creatives/channels", headers=auth(admin_token), timeout=10)
        admin_channels = r.json()["data"]
        check("B1", "admin 渠道清单含 17 个主渠道",
              all(c in admin_channels for c in ["oppo", "vivo", "kwai", "rednote", "ximalaya", "apple", "mi", "rongyao",
                                                 "huawei", "huaweiads", "harmonymarket", "baidusearch", "oppoinfo",
                                                 "vivofeed", "wangyi", "weibo", "youngcrowd"]),
              f"共 {len(admin_channels)} 个")
        r = requests.get(BASE + "/api/v1/creatives/channels", headers=auth(agent_token), timeout=10)
        agent_channels = r.json()["data"]
        check("B2", "渠道用户仅见权限渠道", agent_channels == ["ximalaya"], str(agent_channels))

        # ===== C. 上传 =====
        r = upload(admin_token, [f"{TMP}/a1.png"], "ximalaya", "ACC-PLAN-1")
        d = r.json().get("data", {})
        check("C1", "单图上传并关联计划", r.status_code == 200 and d.get("created") == 1, json.dumps(d, ensure_ascii=False)[:120])

        r = upload(admin_token, [f"{TMP}/a2.png", f"{TMP}/a3.png", f"{TMP}/b1.png"], "ximalaya")
        check("C2", "批量上传 3 张图", r.json().get("data", {}).get("created") == 3)

        r = upload(admin_token, [f"{TMP}/pack.zip"], "ximalaya")
        d = r.json().get("data", {})
        check("C3", "zip 拆分（2 图入库 + txt 跳过）",
              d.get("zipExtracted") == 2 and len(d.get("rejected", [])) == 1, json.dumps(d, ensure_ascii=False)[:150])

        r = upload(admin_token, [f"{TMP}/note.txt"], "ximalaya")
        d = r.json().get("data", {})
        check("C4", "不支持的类型被拒并给出原因", d.get("created") == 0 and len(d.get("rejected", [])) == 1)

        r = requests.post(BASE + "/api/v1/creatives/upload", headers=auth(admin_token),
                          files=[("files", ("x.png", open(f"{TMP}/a1.png", "rb")))], timeout=30)
        check("C5", "缺少渠道字段返回 400", r.status_code == 400, f"HTTP {r.status_code}")

        r = upload(agent_token, [f"{TMP}/b2.png"], "huawei")
        check("C6", "渠道用户上传无权限渠道被拒", r.status_code == 403, f"HTTP {r.status_code}")

        r = upload(agent_token, [f"{TMP}/b2.png"], "ximalaya")
        check("C7", "渠道用户上传权限渠道成功", r.json().get("data", {}).get("created") == 1)

        # 记录素材 id 供后续用例使用
        all_records = list_ids(admin_token, pageSize=100)["records"]
        id_by_name = {}
        for rec in all_records:
            id_by_name.setdefault(rec["filename"], rec["id"])
        c1_id = id_by_name.get("a1.png")
        agent_file_id = id_by_name.get("b2.png")
        created_ids = [rec["id"] for rec in all_records]

        # ===== D. 审核流 =====
        r = requests.get(BASE + "/api/v1/creatives/pending-count", headers=auth(admin_token), timeout=10)
        check("D1", "待审核数量统计", r.json()["data"]["count"] >= 7, f"count={r.json()['data']['count']}")

        r = requests.post(BASE + f"/api/v1/creatives/{c1_id}/review", headers=auth(admin_token), json={"action": "approve"}, timeout=10)
        check("D2", "审核通过", r.status_code == 200 and r.json().get("success"))

        reject_id = id_by_name.get("a2.png")
        r = requests.post(BASE + f"/api/v1/creatives/{reject_id}/review", headers=auth(admin_token), json={"action": "reject"}, timeout=10)
        check("D3", "驳回不带原因返回 400", r.status_code == 400)

        r = requests.post(BASE + f"/api/v1/creatives/{reject_id}/review", headers=auth(admin_token),
                          json={"action": "reject", "comment": "验收测试驳回"}, timeout=10)
        check("D4", "驳回带原因成功", r.status_code == 200 and r.json().get("success"))

        r = requests.post(BASE + f"/api/v1/creatives/{c1_id}/review", headers=auth(admin_token), json={"action": "approve"}, timeout=10)
        check("D5", "重复审核非待审素材返回 400", r.status_code == 400)

        # 驳回的 a2.png 是 admin 传的，用 admin 重提
        r = requests.post(BASE + f"/api/v1/creatives/{reject_id}/resubmit", headers=auth(admin_token), timeout=10)
        check("D6", "驳回后重新提交", r.status_code == 200 and r.json().get("success"))
        rec = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["id"] == reject_id][0]
        check("D6b", "重提后状态回待审且版本+1", rec["status"] == "pending" and rec["version"] == 2,
              f"status={rec['status']} v={rec['version']}")

        r = requests.post(BASE + f"/api/v1/creatives/{c1_id}/resubmit", headers=auth(admin_token), timeout=10)
        check("D7", "非驳回素材重提返回 400", r.status_code == 400)

        r = requests.post(BASE + f"/api/v1/creatives/{c1_id}/review", headers=auth(agent_token), json={"action": "approve"}, timeout=10)
        check("D8", "渠道用户无审核权限", r.status_code == 403, f"HTTP {r.status_code}")

        # ===== E. 数据隔离 =====
        agent_list = list_ids(agent_token, pageSize=100)["records"]
        check("E1", "渠道用户只见自己的素材", all(x["uploaderName"] == "test_agent" for x in agent_list) and len(agent_list) == 1,
              f"可见 {len(agent_list)} 条")

        admin_file = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["id"] == c1_id][0]
        r = requests.get(BASE + f"/api/v1/creatives/file/{admin_file['storedName']}?token={agent_token}", timeout=10)
        check("E2", "渠道用户访问他人素材文件被拒", r.status_code == 403, f"HTTP {r.status_code}")
        r = requests.get(BASE + f"/api/v1/creatives/file/{admin_file['storedName']}?token={admin_token}", timeout=10)
        check("E3", "admin 访问任意素材文件", r.status_code == 200 and len(r.content) > 0, f"HTTP {r.status_code}")
        r = requests.get(BASE + f"/api/v1/creatives/file/{admin_file['storedName']}", timeout=10)
        check("E4", "无 token 访问文件被拒", r.status_code == 401)

        # ===== F. 计划关联 =====
        r = requests.put(BASE + f"/api/v1/creatives/{reject_id}/campaigns", headers=auth(admin_token),
                         json={"campaignIds": ["ACC-PLAN-2"]}, timeout=10)
        rec = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["id"] == reject_id][0]
        check("F1", "关联计划（后关联）", r.status_code == 200 and any(c["campaignId"] == "ACC-PLAN-2" for c in rec["campaigns"]))

        r = requests.put(BASE + f"/api/v1/creatives/{reject_id}/campaigns", headers=auth(admin_token),
                         json={"campaignIds": []}, timeout=10)
        rec = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["id"] == reject_id][0]
        check("F2", "清空计划关联", r.status_code == 200 and len(rec["campaigns"]) == 0)

        r = requests.put(BASE + f"/api/v1/creatives/{c1_id}/campaigns", headers=auth(agent_token),
                         json={"campaignIds": ["HACK"]}, timeout=10)
        check("F3", "渠道用户改他人素材关联被拒", r.status_code == 400, f"HTTP {r.status_code}")

        # ===== G. 效果接口 =====
        r = requests.get(BASE + f"/api/v1/creatives/{c1_id}/performance", headers=auth(admin_token), timeout=10)
        d = r.json()["data"]
        camp = d["campaigns"][0] if d["campaigns"] else {}
        check("G1", "关联计划效果查询（含完整指标）",
              r.status_code == 200 and camp.get("campaignId") == "ACC-PLAN-1" and
              all(k in camp for k in ["cost", "impressions", "clicks", "activations", "accounts", "ctr", "cpa", "roi"]))

        r = requests.get(BASE + f"/api/v1/creatives/{reject_id}/performance", headers=auth(admin_token), timeout=10)
        check("G2", "未关联计划素材给出提示", "尚未关联" in (r.json()["data"].get("message") or ""))

        # ===== H. 持久化（重进不丢数据）=====
        r = upload(admin_token, [f"{TMP}/b1.png"], "ximalaya")
        new_rec = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["filename"] == "b1.png"]
        persist_id = new_rec[0]["id"]
        created_ids.append(persist_id)
        check("H1", "上传素材入库", persist_id > 0, f"id={persist_id}")

        stop_server()
        time.sleep(1)
        ok = start_server("restart")
        check("H2", "后端重启成功", ok)
        if ok:
            _, admin_token2 = login("admin", "admin123")
            rec = [x for x in list_ids(admin_token2, pageSize=100)["records"] if x["id"] == persist_id]
            check("H3", "服务重启后素材记录仍在", len(rec) == 1 and rec[0]["filename"] == "b1.png")
            admin_token = admin_token2 or admin_token

        # ===== I. 删除 =====
        r = requests.delete(BASE + f"/api/v1/creatives/{c1_id}", headers=auth(agent_token), timeout=10)
        check("I1", "渠道用户删他人素材被拒", r.status_code == 400, f"HTTP {r.status_code}")

        del_id = id_by_name.get("z1.png")
        stored = [x for x in list_ids(admin_token, pageSize=100)["records"] if x["id"] == del_id][0]["storedName"]
        file_path = os.path.join(SERVER_DIR, "uploads/creatives", stored)
        r = requests.delete(BASE + f"/api/v1/creatives/{del_id}", headers=auth(admin_token), timeout=10)
        check("I2", "admin 删除素材且磁盘文件清除", r.status_code == 200 and not os.path.exists(file_path))

    finally:
        # 清理验收测试数据
        try:
            for cid in created_ids:
                requests.delete(BASE + f"/api/v1/creatives/{cid}", headers=auth(admin_token), timeout=10)
            if agent_created or True:
                # 删除测试用户（如果接口支持）
                users = requests.get(BASE + "/api/v1/user/users", headers=auth(admin_token), timeout=10)
                try:
                    for u in users.json().get("data", users.json()):
                        if u.get("username") == "test_agent":
                            requests.delete(BASE + f"/api/v1/user/users/{u['id']}", headers=auth(admin_token), timeout=10)
                except Exception:
                    pass
        except Exception as e:
            print("cleanup warn:", e)
        stop_server()
        subprocess.run(f"rm -rf {TMP}", shell=True)

    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r[2])
    print(f"\n===== 验收结果：{passed}/{total} 通过 =====")
    with open("/tmp/acceptance_results.json", "w") as f:
        json.dump([{"id": r[0], "name": r[1], "pass": r[2], "note": r[3]} for r in RESULTS], f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
