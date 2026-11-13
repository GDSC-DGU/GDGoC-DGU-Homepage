def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"success": True, "status": "UP"}
