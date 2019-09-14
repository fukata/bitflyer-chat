# archive_logs

外部サイトにあるbitflyerの過去ログをbitflyer-chatに取り込む。

## 実行 

1. scraping.rb
2. conv_json_data.rb
3. conv_archive_data.rb
4. `gsutil -m cp -z json -r data/out/archives/2019/* gs://bitflyer-chat.appspot.com/public/archives/2019/`